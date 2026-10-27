import type { paths } from "./schema";
export type Data<
  P extends keyof paths,
  M extends keyof paths[P] = "get" extends keyof paths[P] ? "get" : never,
> = paths[P][M] extends {
  responses: { 200: { content: { "application/json": { data: infer T } } } };
}
  ? T
  : never;
export type Me = Data<"/v1/me">;
export type Preferences = Me["preferences"];
export type Catalog = Data<"/v1/catalog">;
export type Transaction = Data<"/v1/transactions/{id}">;
export type Asset = Data<"/v1/assets/{id}">;
export type Debt = Data<"/v1/debts/{id}">;
export type Zakat = Data<"/v1/zakat/summary">;
export type Prayer = Data<"/v1/prayer/today">;
export type Session = Data<"/v1/auth/login", "post">;
