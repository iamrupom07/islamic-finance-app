import React, { useCallback, useEffect, useState } from "react";
import {
  Screen,
  Card,
  Copy,
  Button,
  Empty,
  ErrorRetry,
} from "../../design-system/components";
import {
  downloaded,
  pendingDownload,
  discardPendingDownload,
  downloadAudio,
  pauseDownload,
  removeDownload,
  storageLimit,
} from "../../core/audio/downloads";
import { useAuth } from "../../core/auth/AuthProvider";
import { usePlayer } from "../../core/audio/PlayerProvider";
import { useContent } from "../../content/ContentProvider";
export function DownloadsScreen() {
  const { user } = useAuth(),
    player = usePlayer(),
    { bundle } = useContent();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof downloaded>>>([]),
    [pending, setPending] =
      useState<Awaited<ReturnType<typeof pendingDownload>>>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setRows(await downloaded(user.id));
    setPending(await pendingDownload(user.id));
  }, [user?.id]);
  useEffect(() => {
    void load().catch(setError);
  }, [load]);
  return (
    <Screen
      title="Audio downloads"
      back
      refresh={() => {
        void load().catch(setError);
      }}
    >
      <Copy>{`${Math.round(rows.reduce((sum, r) => sum + r.bytes, 0) / 1024 / 1024)} / ${Math.round(storageLimit / 1024 / 1024)} MB`}</Copy>
      <Copy>
        Downloaded recordings stay on this device and are deleted when you sign
        out. Text is included in the app and does not require an audio download.
      </Copy>
      {pending ? (
        <Card>
          <Copy>{pending.track.title}</Copy>
          <Button
            secondary
            label="Discard partial download"
            disabled={busy}
            onPress={() => {
              if (user)
                void discardPendingDownload(user.id).then(load).catch(setError);
            }}
          />
          <Button
            label="Resume download"
            busy={busy}
            disabled={pending.track.edition !== bundle?.edition}
            onPress={() => {
              if (!user) return;
              setBusy(true);
              void downloadAudio(user.id, pending.track, true)
                .then(load)
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          />
          {busy ? (
            <Button
              secondary
              label="Pause download"
              onPress={() => {
                void pauseDownload().catch(setError);
              }}
            />
          ) : null}
        </Card>
      ) : null}
      {rows.length ? (
        rows.map((r) => (
          <Card key={r.track.id}>
            <Copy>{`${r.track.title} · ${r.track.artist}`}</Copy>
            <Copy>{`${Math.round(r.bytes / 1024 / 1024)} MB`}</Copy>
            <Button
              label="Play downloaded recording"
              disabled={r.track.edition !== bundle?.edition}
              onPress={() => {
                void player?.open(r.track);
              }}
            />
            <Button
              secondary
              label="Delete download"
              disabled={busy}
              onPress={() => {
                if (!user) return;
                if (player?.track?.id === r.track.id) player.stop();
                void removeDownload(user.id, r.track.id)
                  .then(load)
                  .catch(setError);
              }}
            />
          </Card>
        ))
      ) : (
        <Empty message="No downloaded recordings." />
      )}
      {error ? <ErrorRetry error={error} /> : null}
    </Screen>
  );
}
