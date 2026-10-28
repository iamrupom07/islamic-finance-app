import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { baseUrl, sessions } from "../api/client";
import { ApiError } from "../api/errors";
export async function clearExportFiles() {
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) return;
  const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
  for (const name of files)
    if (name.startsWith("amanah-export-"))
      await FileSystem.deleteAsync(FileSystem.cacheDirectory + name, {
        idempotent: true,
      });
}
export async function shareExport(format: "csv" | "json") {
  if (
    Platform.OS === "web" ||
    !FileSystem.cacheDirectory ||
    !(await Sharing.isAvailableAsync())
  )
    throw new ApiError(
      "SHARING_UNAVAILABLE",
      "Use the native app to privately export and share a file.",
    );
  const path =
    FileSystem.cacheDirectory + `amanah-export-${Date.now()}.${format}`;
  const owner = sessions.user?.id;
  if (!owner) throw new ApiError("AUTH_REQUIRED", "Please sign in again.", 401);
  try {
    if (!sessions.accessToken) await sessions.refresh();
    const download = () =>
      FileSystem.downloadAsync(`${baseUrl}/me/export?format=${format}`, path, {
        headers: { Authorization: `Bearer ${sessions.accessToken}` },
      });
    let result = await download();
    if (result.status === 401) {
      await sessions.refresh();
      result = await download();
    }
    if (result.status !== 200)
      throw new ApiError(
        "EXPORT_FAILED",
        "The export could not be downloaded. Please retry.",
        result.status,
      );
    const stat = await FileSystem.getInfoAsync(path);
    if (!stat.exists || stat.size > 20 * 1024 * 1024)
      throw new ApiError(
        "EXPORT_TOO_LARGE",
        "This export exceeds the device sharing limit. Use the authenticated API export from a trusted computer.",
      );
    if (sessions.user?.id !== owner)
      throw new ApiError("SESSION_CHANGED", "Session changed.", 409);
    await Sharing.shareAsync(path, {
      mimeType: format === "csv" ? "text/csv" : "application/json",
      dialogTitle: "Export Amanah data",
    });
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

export async function shareAssessment(id: string) {
  if (
    !/^[a-f0-9-]{36}$/i.test(id) ||
    !FileSystem.cacheDirectory ||
    Platform.OS === "web" ||
    !(await Sharing.isAvailableAsync())
  )
    throw new ApiError(
      "SHARING_UNAVAILABLE",
      "Use the native app to share an assessment.",
    );
  const owner = sessions.user?.id;
  if (!owner) throw new ApiError("AUTH_REQUIRED", "Please sign in again.", 401);
  const path = FileSystem.cacheDirectory + `amanah-export-${Date.now()}.html`;
  try {
    if (!sessions.accessToken) await sessions.refresh();
    const download = () =>
      FileSystem.downloadAsync(
        `${baseUrl}/zakat/history/${id}/statement`,
        path,
        { headers: { Authorization: `Bearer ${sessions.accessToken}` } },
      );
    let result = await download();
    if (result.status === 401) {
      await sessions.refresh();
      result = await download();
    }
    if (result.status !== 200 || sessions.user?.id !== owner)
      throw new ApiError(
        "EXPORT_FAILED",
        "The assessment could not be shared.",
      );
    await Sharing.shareAsync(path, {
      mimeType: "text/html",
      dialogTitle: "Amanah assessment statement",
    });
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
