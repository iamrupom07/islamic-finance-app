const protectedPath =
  /^\/(home|finance|quran|dua|profile|transactions|assets|debts|zakat|prayer|settings)(\/[^?#]*)?(\?[^#]*)?$/;
let pending: string | null = null;
export function safeDestination(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    value.includes("://") ||
    value.includes("\\") ||
    value.includes("..") ||
    !protectedPath.test(value)
  )
    return null;
  return value;
}
export function rememberDestination(value: string) {
  pending = safeDestination(value);
}
export function consumeDestination() {
  const value = pending;
  pending = null;
  return value;
}
export function clearDestination() {
  pending = null;
}
export function setupDestination(step: number) {
  return step >= 2
    ? "/prayer-preferences"
    : step >= 1
      ? "/nisab"
      : "/permissions";
}
