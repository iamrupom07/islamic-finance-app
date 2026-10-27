export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export const humanError = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
