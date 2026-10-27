import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { sessions } from "./client";
import { ApiError } from "./errors";
import { queryClient } from "./client";
import { connected } from "./client";
import { saveSnapshot, readSnapshot } from "../storage/encrypted-cache";
export function useAccountQuery<T>(
  key: readonly unknown[],
  load: () => Promise<T>,
  snapshot = false,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user", user?.id, ...key],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw Error("AUTH_REQUIRED");
      if (!connected && snapshot) {
        const saved = await readSnapshot<T>(user.id, JSON.stringify(key));
        if (saved)
          return {
            ...saved.data,
            __offline: true,
            __capturedAt: saved.capturedAt,
          } as T;
      }
      const result = await load();
      if (sessions.user?.id !== user.id)
        throw new ApiError("SESSION_CHANGED", "Session changed.", 409);
      if (snapshot)
        await saveSnapshot(user.id, JSON.stringify(key), result).catch(
          () => {},
        );
      return result;
    },
  });
}
export function useAccountMutation<TInput, TOutput>(
  work: (input: TInput) => Promise<TOutput>,
) {
  const { user } = useAuth();
  return useMutation({
    mutationFn: work,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] }),
  });
}

export async function snapshotRead<T>(
  userId: string,
  key: readonly unknown[],
  load: () => Promise<T>,
): Promise<T> {
  const cacheKey = JSON.stringify(key);
  if (!connected) {
    const saved = await readSnapshot<T>(userId, cacheKey);
    if (saved)
      return {
        ...saved.data,
        __offline: true,
        __capturedAt: saved.capturedAt,
      } as T;
  }
  const result = await load();
  if (sessions.user?.id !== userId)
    throw new ApiError("SESSION_CHANGED", "Session changed.", 409);
  await saveSnapshot(userId, cacheKey, result).catch(() => {});
  return result;
}
