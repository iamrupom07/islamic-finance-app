import * as FS from "expo-file-system/legacy";
import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import {
  readSnapshot,
  saveSnapshot,
  snapshotsAvailable,
} from "../storage/encrypted-cache";
import { trackSchema, type Track } from "../../content/contract";
export const storageLimit = 256 * 1024 * 1024;
export const trackLimit = 64 * 1024 * 1024;
type Download = { track: Track; uri: string; bytes: number; sha256: string };
type Pending = { track: Track; uri: string; resumeData?: string };
let generation = 0;
let busy = false;
let active: ReturnType<typeof FS.createDownloadResumable> | null = null;
const root = () => {
  if (Platform.OS === "web" || !FS.documentDirectory)
    throw Error("Native downloads only");
  return FS.documentDirectory;
};
async function folder(uid: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uid,
  );
  return root() + `amanah-audio-${hash}/`;
}
export async function downloaded(uid: string) {
  return (
    (await readSnapshot<Download[]>(uid, ["audio-downloads"].join("/")))
      ?.data ?? []
  );
}
async function checksum(uri: string) {
  const bytes = await new File(uri).bytes();
  const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return Array.from(new Uint8Array(hash), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function localAudio(uid: string, track: Track) {
  const d = (await downloaded(uid)).find(
    (d) =>
      d.track.id === track.id &&
      d.track.edition === track.edition &&
      d.track.url === track.url,
  );
  if (!d) return null;
  const stat = await FS.getInfoAsync(d.uri);
  if (
    !stat.exists ||
    stat.size !== d.bytes ||
    (await checksum(d.uri)) !== d.sha256
  ) {
    await removeDownload(uid, track.id);
    throw Error(
      "Downloaded file failed integrity verification. Download it again.",
    );
  }
  return d.uri;
}
export async function removeDownload(uid: string, id: string) {
  if (busy) throw Error("Pause the current download first.");
  const rows = await downloaded(uid);
  for (const d of rows.filter((d) => d.track.id === id))
    await FS.deleteAsync(d.uri, { idempotent: true });
  await saveSnapshot(
    uid,
    "audio-downloads",
    rows.filter((d) => d.track.id !== id),
  );
}
export async function pendingDownload(uid: string) {
  return (
    (await readSnapshot<Pending | null>(uid, "audio-pending"))?.data ?? null
  );
}
export async function discardPendingDownload(uid: string) {
  if (busy) throw Error("Pause the current download first.");
  const pending = await pendingDownload(uid);
  if (pending) {
    const dir = await folder(uid);
    if (!pending.uri.startsWith(dir) || !pending.uri.endsWith(".partial"))
      throw Error("Invalid pending download path.");
    await FS.deleteAsync(pending.uri, { idempotent: true });
    await saveSnapshot(uid, "audio-pending", null);
  }
}
export async function pauseDownload() {
  if (active) {
    const saved = await active.pauseAsync();
    return saved;
  }
  return null;
}
export async function downloadAudio(
  uid: string,
  input: Track,
  resume = false,
  onProgress?: (bytes: number, total: number) => void,
) {
  const track = trackSchema.parse(input);
  if (!track.downloadAllowed)
    throw Error("This recording does not permit downloads.");
  if (busy)
    throw Error("One download at a time. Pause the current download first.");
  const epoch = generation;
  busy = true;
  try {
    if (!(await snapshotsAvailable()))
      throw Error(
        "Encrypted storage is unavailable. Downloads require a native build with encrypted storage.",
      );
    const dir = await folder(uid);
    await FS.makeDirectoryAsync(dir, { intermediates: true });
    if (epoch !== generation) throw Error("Session changed");
    const previous = await pendingDownload(uid);
    if (previous && !resume) {
      if (previous.uri.startsWith(dir))
        await FS.deleteAsync(previous.uri, { idempotent: true });
      await saveSnapshot(uid, "audio-pending", null);
    }
    const rows = await downloaded(uid),
      used = rows
        .filter((d) => d.track.id !== track.id)
        .reduce((s, d) => s + d.bytes, 0);
    const known = new Set(rows.map((d) => d.uri.slice(dir.length)));
    if (previous && resume) known.add(previous.uri.slice(dir.length));
    for (const name of await FS.readDirectoryAsync(dir))
      if (/^[a-zA-Z0-9_-]+\.(mp3|partial)$/.test(name) && !known.has(name))
        await FS.deleteAsync(dir + name, { idempotent: true });
    const free = await FS.getFreeDiskStorageAsync();
    if (
      used + trackLimit > storageLimit ||
      free < trackLimit + 20 * 1024 * 1024
    )
      throw Error("Free storage or the 256 MB download limit is insufficient.");
    const prior = resume ? await pendingDownload(uid) : null;
    if (
      prior &&
      (prior.track.id !== track.id ||
        prior.track.url !== track.url ||
        prior.track.edition !== track.edition)
    )
      throw Error("This saved download belongs to a different edition.");
    const uri = dir + track.id + ".partial";
    if (!prior) await FS.deleteAsync(uri, { idempotent: true });
    let exceeded = false,
      paused = false;
    const task = FS.createDownloadResumable(
      track.url,
      uri,
      {},
      (p) => {
        onProgress?.(p.totalBytesWritten, p.totalBytesExpectedToWrite);
        if (
          !exceeded &&
          (p.totalBytesWritten > trackLimit ||
            p.totalBytesExpectedToWrite > trackLimit)
        ) {
          exceeded = true;
          void task.pauseAsync().catch(() => {});
        }
      },
      prior?.resumeData,
    );
    active = task;
    const pending: Pending = { track, uri };
    await saveSnapshot(uid, "audio-pending", pending);
    const result = await task.downloadAsync();
    if (epoch !== generation) throw Error("Session changed");
    if (exceeded) {
      await FS.deleteAsync(uri, { idempotent: true });
      await saveSnapshot(uid, "audio-pending", null);
      throw Error(
        "This recording exceeds the 64 MB file limit. Stream it instead.",
      );
    }
    if (!result) {
      paused = true;
      const state = task.savable();
      await saveSnapshot(uid, "audio-pending", {
        track,
        uri,
        resumeData: state.resumeData,
      });
    }
    if (paused) return;
    if (!result || ![200, 206].includes(result.status))
      throw Error("The audio download failed. Retry when connected.");
    const stat = await FS.getInfoAsync(uri);
    if (!stat.exists || stat.size <= 0 || stat.size > trackLimit)
      throw Error("The downloaded recording is invalid.");
    const type =
      Object.entries(result.headers).find(
        ([k]) => k.toLowerCase() === "content-type",
      )?.[1] ?? "";
    if (!/audio|octet-stream/i.test(type))
      throw Error("The server did not return an audio recording.");
    const sha256 = await checksum(uri);
    if (epoch !== generation) throw Error("Session changed");
    const destination = dir + track.id + ".mp3";
    await FS.moveAsync({ from: uri, to: destination });
    if (epoch !== generation) {
      await FS.deleteAsync(destination, { idempotent: true });
      throw Error("Session changed");
    }
    if (
      !(await saveSnapshot(uid, "audio-downloads", [
        ...rows.filter((d) => d.track.id !== track.id),
        { track, uri: destination, bytes: stat.size, sha256 },
      ]))
    ) {
      await FS.deleteAsync(destination, { idempotent: true });
      throw Error("Download metadata could not be saved.");
    }
    await saveSnapshot(uid, "audio-pending", null);
  } finally {
    active = null;
    busy = false;
  }
}
export async function purgeDownloads() {
  generation++;
  if (active) await active.pauseAsync().catch(() => {});
  if (Platform.OS === "web" || !FS.documentDirectory) return;
  for (const name of await FS.readDirectoryAsync(FS.documentDirectory))
    if (name.startsWith("amanah-audio-"))
      await FS.deleteAsync(FS.documentDirectory + name, { idempotent: true });
}
