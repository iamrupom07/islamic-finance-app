import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { z } from "zod";
import type { CredentialStore } from "../auth/session-manager";
const key = "amanah.session.v1";
const shape = z.object({
  refreshToken: z.string().min(32),
  userId: z.string(),
});

const isWeb = Platform.OS === "web";

async function getItem(k: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(k)
        : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(k);
}

async function setItem(k: string, v: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(k, v);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.setItemAsync(k, v, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function deleteItem(k: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(k);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(k);
}

export const credentials: CredentialStore = {
  async read() {
    const text = await getItem(key);
    if (!text) return null;
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      await deleteItem(key);
      return null;
    }
    const parsed = shape.safeParse(json);
    if (!parsed.success) {
      await deleteItem(key);
      return null;
    }
    return parsed.data;
  },
  async write(v) {
    await setItem(key, JSON.stringify(v));
  },
  async clear() {
    await deleteItem(key);
  },
};
