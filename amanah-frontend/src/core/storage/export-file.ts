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
    await Sharing.shareAsync(path, {
      mimeType: format === "csv" ? "text/csv" : "application/json",
      dialogTitle: "Export Amanah data",
    });
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
