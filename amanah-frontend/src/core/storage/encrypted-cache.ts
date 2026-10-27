import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
let database: SQLite.SQLiteDatabase | null = null;
let disabled = false;
let opening: Promise<SQLite.SQLiteDatabase | null> | null = null;
const filename = "amanah-snapshots.db";
const keyName = "amanah.snapshot-key.v1";
async function open() {
  if (Platform.OS === "web" || disabled) return null;
  if (database) return database;
  if (opening) return opening;
  opening = (async () => {
    let db: SQLite.SQLiteDatabase | null = null;
    try {
      db = await SQLite.openDatabaseAsync(filename);
      // Query the encryption capability before executing any private-data DDL or writes.
      const cipher = await db.getFirstAsync<Record<string, unknown>>(
        "PRAGMA cipher_version",
      );
      if (
        !cipher ||
        !Object.values(cipher).some(
          (v) => typeof v === "string" && v.length > 0,
        )
      ) {
        disabled = true;
        await db.closeAsync();
        return null;
      }
      let key = await SecureStore.getItemAsync(keyName);
      if (!key) {
        key = Array.from(await Crypto.getRandomBytesAsync(32), (v) =>
          v.toString(16).padStart(2, "0"),
        ).join("");
        await SecureStore.setItemAsync(keyName, key, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
      if (!/^[a-f0-9]{64}$/.test(key)) throw Error("Invalid key");
      await db.execAsync(`PRAGMA key = "x'${key}'";`);
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS snapshots (user_id TEXT NOT NULL, cache_key TEXT NOT NULL, payload TEXT NOT NULL, captured_at TEXT NOT NULL, PRIMARY KEY (user_id, cache_key))",
      );
      database = db;
      return db;
    } catch {
      disabled = true;
      if (db) await db.closeAsync().catch(() => {});
      return null;
    }
  })().finally(() => {
    opening = null;
  });
  return opening;
}
let generation = 0;
let operations: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>) {
  const next = operations.catch(() => {}).then(work);
  operations = next;
  return next;
}
export function saveSnapshot(userId: string, key: string, payload: unknown) {
  const epoch = generation;
  return serialized(async () => {
    if (epoch !== generation) return;
    const db = await open();
    if (db && epoch === generation)
      await db.runAsync(
        "INSERT OR REPLACE INTO snapshots (user_id,cache_key,payload,captured_at) VALUES (?,?,?,?)",
        userId,
        key,
        JSON.stringify({ sourceVersion: 1, payload }),
        new Date().toISOString(),
      );
  });
}
export function readSnapshot<T>(
  userId: string,
  key: string,
): Promise<{ data: T; capturedAt: string } | null> {
  const epoch = generation;
  return serialized(async () => {
    if (epoch !== generation) return null;
    const db = await open();
    if (!db) return null;
    const row = await db.getFirstAsync<{
      payload: string;
      captured_at: string;
    }>(
      "SELECT payload,captured_at FROM snapshots WHERE user_id=? AND cache_key=?",
      userId,
      key,
    );
    if (!row || epoch !== generation) return null;
    try {
      const saved = JSON.parse(row.payload);
      return saved.sourceVersion === 1
        ? { data: saved.payload as T, capturedAt: row.captured_at }
        : null;
    } catch {
      return null;
    }
  });
}
export function clearSnapshots() {
  generation++;
  return serialized(async () => {
    if (opening) await opening;
    if (database) {
      await database.closeAsync();
      database = null;
    }
    if (Platform.OS !== "web")
      await SQLite.deleteDatabaseAsync(filename).catch(() => {});
    await SecureStore.deleteItemAsync(keyName);
  });
}
