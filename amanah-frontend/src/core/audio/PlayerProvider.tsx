import { PrivateModal as Modal } from "../privacy/PrivateModal";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Linking, AppState, Platform, ScrollView, View } from "react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthProvider";
import { readSnapshot, saveSnapshot } from "../storage/encrypted-cache";
import { usePrivacy } from "../privacy/PrivacyProvider";
import { onDevicePurge } from "../privacy/device-events";
import { trackSchema, type Track } from "../../content/contract";
import { useContent } from "../../content/ContentProvider";
import { localAudio } from "./downloads";
import { usePlayerLayout } from "./layout";
import {
  Button,
  Copy,
  Field,
  Card,
  ErrorRetry,
} from "../../design-system/components";
import { useTheme } from "../../design-system/ThemeProvider";
type Player = {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  error: unknown;
  repeat: boolean;
  open: (track: Track) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => Promise<void>;
  stop: () => void;
  setRepeat: (on: boolean) => void;
};
const Context = createContext<Player | null>(null);
export const usePlayer = () => useContext(Context);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(),
    { bundle } = useContent();
  const privacy = usePrivacy();
  const player = useAudioPlayer(null, {
      updateInterval: 1000,
      allowsExternalPlayback: false,
    }),
    status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<Track | null>(null),
    [error, setError] = useState<unknown>(null),
    [repeat, setRepeat] = useState(false);
  const trackOwner = useRef<string | undefined>(undefined);
  const epoch = useRef(0),
    owner = useRef(user?.id),
    pending = useRef<number | null>(null),
    current = useRef({ track, time: 0 });
  owner.current = user?.id;
  current.current = { track, time: status.currentTime };
  const persist = useCallback(async () => {
    const value = current.current;
    if (
      owner.current &&
      owner.current === trackOwner.current &&
      value.track &&
      Number.isFinite(value.time)
    )
      await saveSnapshot(owner.current, "audio-resume", {
        track: value.track,
        seconds: Math.max(0, value.time),
        updatedAt: new Date().toISOString(),
      });
  }, []);
  const stop = useCallback(() => {
    epoch.current++;
    trackOwner.current = undefined;
    pending.current = null;
    player.pause();
    try {
      player.setActiveForLockScreen(false);
    } catch {
      // ignore
    }
    player.replace(null);
    setTrack(null);
    setError(null);
  }, [player]);
  useEffect(
    () =>
      onDevicePurge(() => {
        stop();
      }),
    [stop],
  );
  useEffect(() => {
    stop();
  }, [user?.id, stop]);
  useEffect(() => {
    if (privacy.locked) player.pause();
  }, [privacy.locked, player]);
  useEffect(() => {
    player.loop = repeat;
  }, [repeat, player]);
  useEffect(() => {
    if (status.isLoaded && pending.current !== null) {
      const at = pending.current;
      pending.current = null;
      if (at > 0 && Number.isFinite(status.duration) && status.duration > 0) {
        void player
          .seekTo(Math.min(at, Math.max(0, status.duration - 0.1)))
          .then(() => player.play())
          .catch(setError);
      } else {
        player.play();
      }
    }
  }, [status.isLoaded, status.duration, player]);
  useEffect(() => {
    if (
      track &&
      status.currentTime > 0 &&
      Math.floor(status.currentTime) % 5 === 0
    )
      void persist().catch(() => {});
  }, [track, status.currentTime, persist]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") void persist().catch(() => {});
    });
    return () => sub.remove();
  }, [persist]);
  useEffect(() => {
    if (!track || status.isLoaded || status.error) return;
    const timer = setTimeout(() => {
      player.pause();
      setError(
        Error("Audio loading timed out. Check your connection and retry."),
      );
    }, 20000);
    return () => clearTimeout(timer);
  }, [track, status.isLoaded, status.error, player]);
  const open = async (input: Track) => {
    const request = ++epoch.current,
      uid = owner.current ?? "guest";
    try {
      const next = trackSchema.parse(input);
      if (!bundle || next.edition !== bundle.edition)
        throw Error("The audio edition does not match the installed text.");
      await persist();
      player.pause();
      setError(null);
      const saved = owner.current
        ? await readSnapshot<{ track: Track; seconds: number }>(
            owner.current,
            "audio-resume",
          )
        : null;
      const local = owner.current
        ? await localAudio(owner.current, next)
        : null;
      if (request !== epoch.current || uid !== (owner.current ?? "guest"))
        return;
      if (Platform.OS !== "web") {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "doNotMix",
          allowsRecording: false,
        });
      }
      if (request !== epoch.current || uid !== (owner.current ?? "guest"))
        return;
      pending.current =
        saved?.data.track.id === next.id &&
        saved.data.track.edition === next.edition
          ? saved.data.seconds
          : 0;
      trackOwner.current = owner.current;
      setTrack(next);
      player.replace(local ?? next.url);
      player.play();
      try {
        player.setActiveForLockScreen(
          true,
          { title: next.title, artist: next.artist, albumTitle: "Amanah" },
          { showSeekBackward: true, showSeekForward: true },
        );
      } catch {
        // ignore
      }
    } catch (e) {
      if (request === epoch.current) {
        pending.current = null;
        setError(e);
      }
    }
  };
  const seek = async (seconds: number) => {
    if (!status.isLoaded) return;
    await player.seekTo(
      Math.min(Math.max(0, seconds), Math.max(0, status.duration - 0.1)),
    );
    void persist().catch(() => {});
  };
  const pause = () => {
    player.pause();
    void persist().catch(() => {});
  };
  const toggle = () => {
    if (status.playing) pause();
    else player.play();
  };
  return (
    <Context.Provider
      value={{
        track,
        playing: status.playing,
        loading: !!track && !status.isLoaded,
        time: status.currentTime,
        duration: status.duration,
        error: error ?? status.error,
        repeat,
        open,
        pause,
        toggle,
        seek,
        stop,
        setRepeat,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function AudioControls() {
  const p = usePlayer();
  const [seconds, setSeconds] = useState("");
  if (!p?.track) return null;
  return (
    <Card>
      <Copy medium>{p.track.title}</Copy>
      <Copy>{p.track.artist}</Copy>
      <Copy>{`${Math.floor(p.time)} / ${Math.floor(p.duration)} s`}</Copy>
      {p.loading ? <Copy>Loading audio</Copy> : null}
      <Button
        label={p.playing ? "Pause" : "Play"}
        onPress={p.toggle}
        disabled={p.loading}
      />
      <Button
        secondary
        label="Back 15 seconds"
        onPress={() => {
          void p.seek(p.time - 15).catch(() => {});
        }}
      />
      <Button
        secondary
        label="Forward 15 seconds"
        onPress={() => {
          void p.seek(p.time + 15).catch(() => {});
        }}
      />
      <Field
        label="Seek to seconds"
        keyboardType="numeric"
        value={seconds}
        onChangeText={setSeconds}
      />
      <Button
        secondary
        label="Seek"
        disabled={!/^\d+(\.\d+)?$/.test(seconds)}
        onPress={() => {
          void p.seek(Number(seconds)).catch(() => {});
        }}
      />
      <Button
        secondary
        label={p.repeat ? "Repeat on" : "Repeat off"}
        onPress={() => p.setRepeat(!p.repeat)}
      />
      {p.error ? (
        <>
          <ErrorRetry error={p.error} />
          <Button
            label="Retry audio"
            onPress={() => {
              void p.open(p.track!);
            }}
          />
        </>
      ) : null}
      <Button
        secondary
        label="Recording source and permissions"
        onPress={() => {
          void Linking.openURL(p.track!.rights);
        }}
      />
      <Button secondary label="Close player" onPress={p.stop} />
    </Card>
  );
}
export function MiniPlayer() {
  const p = usePlayer(),
    segments = useSegments(),
    insets = useSafeAreaInsets(),
    { colors, t } = useTheme(),
    layout = usePlayerLayout();
  const [expanded, setExpanded] = useState(false);
  const tabs = (segments as string[]).includes("(tabs)");
  useEffect(() => {
    if (!p?.track) layout.setPlayerHeight(0);
  }, [p?.track, layout.setPlayerHeight]);
  if (!p?.track) return null;
  return (
    <>
      <View
        onLayout={(e) => layout.setPlayerHeight(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: insets.bottom + (tabs ? layout.dockHeight + 24 : 12),
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
          padding: 12,
          gap: 8,
          maxWidth: 680,
          alignSelf: "center",
        }}
      >
        <Button
          secondary
          label={`${p.track.title} · ${p.track.artist}`}
          onPress={() => setExpanded(true)}
        />
        <Button
          label={p.playing ? "Pause" : "Play"}
          disabled={p.loading}
          onPress={p.toggle}
        />
        {p.error ? <Copy>Audio unavailable. Open player to retry.</Copy> : null}
      </View>
      <Modal
        visible={expanded}
        onRequestClose={() => setExpanded(false)}
        animationType="slide"
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            backgroundColor: colors.canvas,
            gap: 12,
          }}
          accessibilityViewIsModal
        >
          <Copy accessibilityRole="header" size={24}>
            {t("Audio player")}
          </Copy>
          <AudioControls />
          <Button label="Back" onPress={() => setExpanded(false)} />
        </ScrollView>
      </Modal>
    </>
  );
}
