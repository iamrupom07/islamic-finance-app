import createClient from "openapi-fetch";
import { purgeDeviceState } from "../privacy/device-events";
import { purgeDownloads } from "../audio/downloads";
import { QueryClient } from "@tanstack/react-query";
import type { paths } from "./schema";
import { ApiError } from "./errors";
import { SessionManager } from "../auth/session-manager";
import { credentials } from "../storage/credentials";
import { clearSnapshots } from "../storage/encrypted-cache";
import { responseValidators } from "./response-validators";
import { clearReminders } from "../notifications/scheduler";
import { clearExportFiles } from "../storage/export-file";
import { clearDestination } from "../navigation/destinations";
import type { Session } from "./types";
export const baseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/v1"
).replace(/\/$/, "");
if (!__DEV__ && !baseUrl.startsWith("https://"))
  throw new Error("Amanah requires an HTTPS API URL.");
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      staleTime: 30000,
      gcTime: 5 * 60000,
      retry: (count, error) =>
        count < 2 &&
        error instanceof ApiError &&
        [0, 503, 504].includes(error.status),
      retryDelay: (n) => Math.min(4000, 500 * 2 ** n),
    },
    mutations: { retry: false, networkMode: "always" },
  },
});
export { connected, setConnected } from "./network";
import { connected } from "./network";
const errorEnvelope = (
  value: unknown,
): {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
} => (value && typeof value === "object" ? value : {});
async function parseError(response: Response) {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    value = {};
  }
  const error = errorEnvelope(value).error;
  return new ApiError(
    error?.code ?? "SERVICE_UNAVAILABLE",
    error?.message ?? "The service is temporarily unavailable.",
    response.status,
    error?.fields,
    Number(response.headers.get("Retry-After") ?? 0) || undefined,
  );
}
async function raw(input: Request, token?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const headers = new Headers(input.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(
      new Request(input, { headers, signal: controller.signal }),
    );
  } catch {
    throw new ApiError(
      connected ? "TIMEOUT" : "OFFLINE",
      connected
        ? "The request could not be confirmed. Please retry."
        : "You are offline. Your draft is kept on this screen.",
    );
  } finally {
    clearTimeout(timer);
  }
}
let notifyClear = () => {};
export const onSessionCleared = (fn: () => void) => {
  notifyClear = fn;
};
export const sessions = new SessionManager(
  credentials,
  async (refreshToken) => {
    const res = await raw(
      new Request(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }),
    );
    if (!res.ok) throw await parseError(res);
    const body = await res.json();
    const parsed =
      responseValidators["/v1/auth/refresh"]?.post?.safeParse(body);
    if (!parsed?.success)
      throw new ApiError(
        "INVALID_RESPONSE",
        "The session response was invalid.",
      );
    return (parsed.data as { data: Session }).data;
  },
  async () => {
    queryClient.clear();
    clearDestination();
    const results = await Promise.allSettled([
      purgeDeviceState(),
      clearSnapshots(),
      clearReminders(),
      clearExportFiles(),
      purgeDownloads(),
    ]);
    notifyClear();
    if (results.some((r) => r.status === "rejected"))
      throw new ApiError(
        "PURGE_INCOMPLETE",
        "Signed out. Some device files could not be removed; retry device cleanup before sharing this device.",
      );
  },
);
async function authenticatedFetch(input: Request) {
  if (!connected && input.method !== "GET")
    throw new ApiError("OFFLINE", "You are offline. Reconnect to save.");
  const publicPath =
    /\/auth\/(register|login|google|apple|apple\/nonce|verify-email|password\/forgot|password\/reset)$/.test(
      input.url,
    ) || /\/catalog$/.test(input.url);
  const owner = publicPath ? undefined : sessions.user?.id;
  const assertOwner = () => {
    if (owner && owner !== sessions.user?.id)
      throw new ApiError(
        "SESSION_CHANGED",
        "Session changed. Please reload.",
        409,
      );
  };
  const retry = input.clone();
  let res = await raw(
    input,
    publicPath ? undefined : (sessions.accessToken ?? undefined),
  );
  assertOwner();
  if (res.status === 401 && !publicPath) {
    await sessions.refresh();
    assertOwner();
    res = await raw(retry, sessions.accessToken ?? undefined);
    assertOwner();
  }
  if (res.status === 401 && !publicPath) await sessions.clear();
  if (!res.ok) throw await parseError(res);
  const path = new URL(input.url).pathname;
  const match = Object.entries(responseValidators).find(([pattern]) =>
    new RegExp("^" + pattern.replace(/\{[^}]+\}/g, "[^/]+") + "$").test(path),
  );
  const validate = match?.[1][input.method.toLowerCase() as "get"];
  if (validate && !path.endsWith("/export")) {
    const value = await res.clone().json();
    if (!validate.safeParse(value).success)
      throw new ApiError(
        "INVALID_RESPONSE",
        "The server response was not recognized. Update the app or retry.",
      );
  }
  return res;
}
export const api = createClient<paths>({
  baseUrl: baseUrl.replace(/\/v1$/, ""),
  fetch: authenticatedFetch,
});
export function dataOf<T>(r: { data?: { data: T }; error?: unknown }): T {
  if (!r.data)
    throw new ApiError("INVALID_RESPONSE", "No response was received.");
  return r.data.data;
}
