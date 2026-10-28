import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth/AuthProvider";
import { useTheme } from "../../design-system/ThemeProvider";
import { onDevicePurge } from "./device-events";
const key = "amanah.device-privacy.v2";
const Privacy = createContext({
  hidden: false,
  locked: false,
  ready: true,
  enabled: false,
  toggleHidden: async () => {},
  setEnabled: async (value: boolean) => {
    void value;
  },
  unlock: async () => {},
});
export const usePrivacy = () => useContext(Privacy);
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [hidden, setHidden] = useState(false),
    [enabled, setLock] = useState(false),
    [locked, setLocked] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [initializedOwner, setInitializedOwner] = useState<string | undefined>(
    undefined,
  );
  const privateReady = ready && initializedOwner === uid;
  const owner = useRef(uid),
    authenticating = useRef(false),
    epoch = useRef(0);
  owner.current = uid;
  useEffect(() => {
    const request = ++epoch.current;
    setReady(false);
    setHidden(false);
    setLock(false);
    setLocked(false);
    void (async () => {
      try {
        if (Platform.OS !== "web" && uid) {
          const raw = await SecureStore.getItemAsync(key);
          const value = raw ? JSON.parse(raw) : null;
          if (request === epoch.current && value?.uid === uid) {
            setHidden(value.hidden === true);
            setLock(value.enabled === true);
            setLocked(value.enabled === true);
          }
        }
      } catch {
        if (request === epoch.current) {
          setLocked(true);
          setLock(true);
          setError(
            "Device privacy settings could not be read. Authenticate to continue.",
          );
        }
      } finally {
        if (request === epoch.current) {
          setInitializedOwner(uid);
          setReady(true);
        }
      }
    })();
  }, [uid]);
  useEffect(
    () =>
      onDevicePurge(async () => {
        epoch.current++;
        setHidden(false);
        setLocked(false);
        setLock(false);
        await SecureStore.deleteItemAsync(key);
      }),
    [],
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (enabled && s !== "active" && !authenticating.current) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);
  const persist = async (h: boolean, e: boolean) => {
    if (Platform.OS === "web")
      throw Error("Device privacy controls require the native app.");
    if (!uid) return;
    const request = epoch.current;
    await SecureStore.setItemAsync(
      key,
      JSON.stringify({ uid, hidden: h, enabled: e }),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    if (request !== epoch.current || uid !== owner.current) {
      await SecureStore.deleteItemAsync(key);
      throw Error("Session changed");
    }
  };
  const authenticate = async () => {
    const request = epoch.current;
    const expected = owner.current;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Amanah",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      });
      if (!result.success)
        throw Error("Device authentication was not completed.");
      if (request !== epoch.current || expected !== owner.current)
        throw Error("Session changed");
    } finally {
      authenticating.current = false;
    }
  };
  const unlock = async () => {
    setError("");
    try {
      await authenticate();
      setLocked(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed");
    }
  };
  const setEnabled = async (value: boolean) => {
    await authenticate();
    await persist(hidden, value);
    setLock(value);
    setLocked(false);
  };
  const toggleHidden = async () => {
    await persist(!hidden, enabled);
    setHidden((v) => !v);
  };
  return (
    <Privacy.Provider
      value={{
        hidden,
        locked: locked || !privateReady,
        ready: privateReady,
        enabled,
        toggleHidden,
        setEnabled,
        unlock,
      }}
    >
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={!!uid && (!privateReady || locked)}
        importantForAccessibility={
          uid && (!privateReady || locked) ? "no-hide-descendants" : "auto"
        }
      >
        {children}
      </View>
      {uid && (!privateReady || locked) ? (
        <PrivacyCover ready={privateReady} error={error} unlock={unlock} />
      ) : null}
    </Privacy.Provider>
  );
}
function PrivacyCover({
  ready,
  error,
  unlock,
}: {
  ready: boolean;
  error: string;
  unlock: () => Promise<void>;
}) {
  const { colors, t } = useTheme();
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: colors.canvas,
        zIndex: 1000,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 20,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.ink, fontSize: 28 }}
      >
        {t("Amanah is locked")}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.expense }}>
          {t(error)}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={() => {
          void unlock();
        }}
        style={{
          minHeight: 48,
          backgroundColor: colors.brand,
          padding: 20,
          borderRadius: 24,
        }}
      >
        <Text style={{ color: colors.canvas }}>
          {t(ready ? "Unlock" : "Loading")}
        </Text>
      </Pressable>
    </View>
  );
}
