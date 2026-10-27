import { authorizeWrite } from "../../platform/auth/actor-context.js";
import { hijriAnniversary } from "../zakat/hijri.js";
import { IdentityService } from "../identity/identity.service.js";
import type { UserPreference } from "@prisma/client";
import type { z } from "zod";
import type { Context } from "../../platform/context.js";
import { cities, methods } from "../catalog/catalog.service.js";
import { AppError, conflict } from "../../platform/http/errors.js";
import { PreferencesRepository } from "./preferences.repository.js";
import {
  reminderSettings,
  type preferenceInput,
} from "./preferences.schemas.js";
export const preferenceDto = (p: UserPreference) => ({
  ...p,
  setupCompletedAt: p.setupCompletedAt?.toISOString() ?? null,
  reminders: reminderSettings.parse(p.reminders),
});
export class PreferencesService {
  private repo: PreferencesRepository;
  constructor(private ctx: Context) {
    this.repo = new PreferencesRepository(ctx.db);
  }
  async account(userId: string) {
    return {
      user: await new IdentityService(this.ctx).getPublicUser(userId),
      preferences: await this.get(userId),
    };
  }
  async get(userId: string) {
    return preferenceDto(await this.repo.get(userId));
  }
  async update(userId: string, input: z.infer<typeof preferenceInput>) {
    const { version, completeSetup, ...data } = input;
    if (data.hijriAnchor) hijriAnniversary(data.hijriAnchor);
    const city = data.cityId
      ? cities.find((c) => c.id === data.cityId)
      : undefined;
    if (data.cityId && !city)
      throw new AppError(400, "VALIDATION_ERROR", "Select a supported city.");
    if (
      data.methodId !== undefined &&
      !methods.some((m) => m.id === data.methodId)
    )
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Select a supported calculation method.",
      );
    if (
      data.policyVersionId &&
      !(await this.repo.approvedPolicy(data.policyVersionId))
    )
      throw new AppError(
        422,
        "POLICY_UNAPPROVED",
        "This calculation policy has not been approved.",
      );
    return this.ctx.db.$transaction(async (tx) => {
      await authorizeWrite(tx, userId);
      const updated = await tx.userPreference.updateMany({
        where: { userId, version },
        data: {
          ...data,
          ...(city ? { timezone: city.timezone } : {}),
          ...(completeSetup
            ? { setupCompletedAt: this.ctx.now(), setupStep: 3 }
            : {}),
          version: { increment: 1 },
        },
      });
      if (!updated.count) throw conflict();
      return preferenceDto(
        await tx.userPreference.findUniqueOrThrow({ where: { userId } }),
      );
    });
  }
}
