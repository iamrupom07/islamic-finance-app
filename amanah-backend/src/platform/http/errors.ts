export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export const missing = () =>
  new AppError(404, "NOT_FOUND", "This record is unavailable.");
export const conflict = () =>
  new AppError(
    409,
    "VERSION_CONFLICT",
    "This record changed. Reload it before saving.",
  );
export const unavailable = (
  message = "This service is temporarily unavailable.",
) => new AppError(503, "PROVIDER_UNAVAILABLE", message);
export const authRequired = () =>
  new AppError(401, "AUTH_REQUIRED", "Please sign in again.");
