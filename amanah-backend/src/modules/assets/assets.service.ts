import type { Asset, Prisma } from "@prisma/client";
import { z } from "zod";
import type { Context } from "../../platform/context.js";
import { D } from "../../platform/money/decimal.js";
import { writeOnce, audit } from "../../platform/http/idempotency.js";
import { decodeCursor, encodeCursor } from "../../platform/http/pagination.js";
import { missing, conflict, AppError } from "../../platform/http/errors.js";
import { paging } from "../../platform/http/schemas.js";
import { assetInput, assetPatch } from "./assets.schemas.js";
import { AssetRepository } from "./assets.repository.js";
export const assetDto = (r: Asset) => ({
  ...r,
  declaredValue: r.declaredValue?.toString() ?? null,
  weightGrams: r.weightGrams?.toString() ?? null,
  weightQuantity: r.weightQuantity?.toFixed(12) ?? null,
  purity: r.purity?.toString() ?? null,
  valuedOn: r.valuedOn.toISOString().slice(0, 10),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
function normalize(input: z.infer<typeof assetInput>) {
  if (input.valuationMode === "MANUAL") {
    if (
      !input.declaredValue ||
      input.weightGrams != null ||
      input.purity != null ||
      input.weightQuantity != null ||
      input.weightUnit != null
    )
      throw new AppError(
        422,
        "BUSINESS_RULE_VIOLATION",
        "Manual valuation requires one value and no weight or purity.",
      );
    return {
      ...input,
      declaredValue: input.declaredValue,
      weightGrams: null,
      purity: null,
      valuedOn: new Date(input.valuedOn),
    };
  }
  if (
    !["GOLD", "SILVER"].includes(input.type) ||
    input.declaredValue != null ||
    !input.weightGrams ||
    !input.purity ||
    new D(input.weightGrams).lte(0) ||
    new D(input.purity).lte(0)
  )
    throw new AppError(
      422,
      "BUSINESS_RULE_VIOLATION",
      "Metal valuation requires weight and purity, with no manual value.",
    );
  if ((input.weightQuantity == null) !== (input.weightUnit == null))
    throw new AppError(
      422,
      "WEIGHT_CONVERSION_INVALID",
      "Supply both original quantity and weight unit.",
    );
  if (input.weightQuantity && input.weightUnit) {
    const factors = {
      g: "1",
      bhori: "11.664",
      tola: "11.6638038",
      ozt: "31.1034768",
    };
    if (
      !new D(input.weightQuantity)
        .mul(factors[input.weightUnit])
        .toDecimalPlaces(6)
        .eq(input.weightGrams!)
    )
      throw new AppError(
        422,
        "WEIGHT_CONVERSION_INVALID",
        "Normalized grams do not match the selected quantity and unit.",
      );
  }
  return {
    ...input,
    declaredValue: null,
    weightGrams: input.weightGrams,
    purity: input.purity,
    valuedOn: new Date(input.valuedOn),
  };
}
export class AssetService {
  private repo = new AssetRepository();
  constructor(private ctx: Context) {}
  async get(uid: string, id: string) {
    const r = await this.repo.get(this.ctx.db, uid, id);
    if (!r) throw missing();
    return assetDto(r);
  }
  async list(
    uid: string,
    q: z.infer<typeof paging> & { direction?: "I_OWE" | "OWED_TO_ME" },
  ) {
    const scope = JSON.stringify({ domain: "assets", direction: q.direction });
    const c = decodeCursor(this.ctx.env.CURSOR_SECRET, q.cursor, uid, scope);
    const where: Prisma.AssetWhereInput = {
      userId: uid,
      deletedAt: null,
      ...(c
        ? {
            OR: [
              { createdAt: { lt: c.date } },
              { createdAt: c.date, id: { lt: c.id } },
            ],
          }
        : {}),
    };
    const rows = await this.repo.list(this.ctx.db, where, q.limit + 1);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map(assetDto),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor(
              this.ctx.env.CURSOR_SECRET,
              uid,
              scope,
              last.createdAt,
              last.id,
            )
          : null,
    };
  }
  async create(uid: string, key: string, b: z.infer<typeof assetInput>) {
    return writeOnce(this.ctx.db, uid, "assets:create", key, b, async (tx) => {
      const data = normalize(b);
      const r = await tx.asset.create({ data: { ...data, userId: uid } });
      await audit(
        tx,
        this.ctx.env.REFRESH_TOKEN_PEPPER,
        uid,
        "Asset",
        r.id,
        "CREATE",
      );
      return assetDto(r);
    });
  }
  async update(
    uid: string,
    id: string,
    key: string,
    patch: z.infer<typeof assetPatch>,
  ) {
    return writeOnce(
      this.ctx.db,
      uid,
      "assets:update:" + id,
      key,
      patch,
      async (tx) => {
        const prior = await this.repo.get(tx, uid, id);
        if (!prior) throw missing();
        const { version, ...fields } = patch;
        const b = assetInput.parse({
          type: prior.type,
          label: prior.label,
          note: prior.note,
          currency: prior.currency,
          valuationMode: prior.valuationMode,
          declaredValue: prior.declaredValue?.toString() ?? null,
          weightGrams: prior.weightGrams?.toString() ?? null,
          weightQuantity: prior.weightQuantity?.toFixed(12) ?? null,
          weightUnit: prior.weightUnit,
          purity: prior.purity?.toString() ?? null,
          valuedOn: prior.valuedOn.toISOString().slice(0, 10),
          ...fields,
        });
        const data = normalize(b);
        const change = await tx.asset.updateMany({
          where: { userId: uid, id, version, deletedAt: null },
          data: { ...data, version: { increment: 1 } },
        });
        if (!change.count) throw conflict();
        const r = (await this.repo.get(tx, uid, id))!;
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Asset",
          id,
          "UPDATE",
        );
        return assetDto(r);
      },
    );
  }
  async remove(uid: string, id: string, key: string, version: number) {
    return writeOnce(
      this.ctx.db,
      uid,
      "assets:delete:" + id,
      key,
      { version },
      async (tx) => {
        if (!(await this.repo.get(tx, uid, id))) throw missing();
        const r = await tx.asset.updateMany({
          where: { userId: uid, id, version, deletedAt: null },
          data: { deletedAt: this.ctx.now(), version: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        await audit(
          tx,
          this.ctx.env.REFRESH_TOKEN_PEPPER,
          uid,
          "Asset",
          id,
          "DELETE",
        );
        return { ok: true as const };
      },
    );
  }
}
