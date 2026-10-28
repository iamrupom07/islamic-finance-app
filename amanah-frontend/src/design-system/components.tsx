import { PrivateModal as Modal } from "../core/privacy/PrivateModal";
import { usePlayerLayout } from "../core/audio/layout";
import { usePrivacy } from "../core/privacy/PrivacyProvider";
import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
  RefreshControl,
} from "react-native";
import type {
  TextStyle,
  ViewStyle,
  StyleProp,
  TextInputProps,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, X } from "lucide-react-native";
import { useTheme } from "./ThemeProvider";
import { formatMoney } from "../core/i18n/formatters";
import { useOnline } from "../core/api/network";
import { humanError } from "../core/api/errors";
export function Copy({
  children,
  size = 14,
  muted = false,
  medium = false,
  style,
  accessibilityRole,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  medium?: boolean;
  style?: TextStyle;
  accessibilityRole?: "header";
}) {
  const { colors, locale, t } = useTheme();
  return (
    <Text
      accessibilityRole={accessibilityRole}
      style={{
        color: muted ? colors.muted : colors.ink,
        fontFamily:
          locale === "bn" ? "Bengali" : medium ? "OutfitMedium" : "Outfit",
        fontSize: size,
        lineHeight: size * 1.5,
        ...style,
      }}
    >
      {typeof children === "string" ? t(children) : children}
    </Text>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Copy size={32} accessibilityRole="header" style={{ marginVertical: 8 }}>
      {children}
    </Copy>
  );
}
export function Card({
  children,
  tint = false,
  style,
}: {
  children: React.ReactNode;
  tint?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tint ? colors.brandFill : colors.surface,
        borderRadius: tint ? 20 : 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: tint ? "transparent" : colors.border,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 12, ...style }}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const { colors, t } = useTheme();
  const bg = secondary
    ? colors.surface
    : danger
      ? colors.expense
      : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: bg,
        borderWidth: secondary ? 1 : 0,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
        opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.canvas} />
      ) : (
        <Copy
          medium
          style={{
            color: secondary ? colors.ink : colors.canvas,
            textAlign: "center",
          }}
        >
          {label}
        </Copy>
      )}
    </Pressable>
  );
}
export function ActionRow({
  label,
  detail,
  onPress,
  danger = false,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 52, paddingVertical: 10 }}
    >
      <Row>
        <View style={{ flex: 1 }}>
          <Copy medium style={danger ? { color: colors.expense } : undefined}>
            {label}
          </Copy>
          {detail ? (
            <Copy muted size={12}>
              {detail}
            </Copy>
          ) : null}
        </View>
        <ChevronRight color={colors.muted} size={18} strokeWidth={1.7} />
      </Row>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const { colors, locale, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Copy medium>{label}</Copy>
      <TextInput
        accessibilityLabel={t(label)}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? colors.expense : colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.ink,
            fontSize: 16,
            fontFamily: locale === "bn" ? "Bengali" : "Outfit",
            backgroundColor: colors.surface,
          },
          props.style,
        ]}
      />
      {error ? <Copy style={{ color: colors.expense }}>{error}</Copy> : null}
    </View>
  );
}
export function PasswordField(
  props: TextInputProps & { error?: string; label?: string },
) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Field
        {...props}
        label={props.label ?? "Password"}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        secondary
        label={show ? "Hide password" : "Show password"}
        onPress={() => setShow((v) => !v)}
      />
    </View>
  );
}
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const { colors, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Copy medium>{label}</Copy>
      <Button
        secondary
        label={options.find((o) => o.value === value)?.label ?? "Choose"}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000060",
          }}
        >
          <SafeAreaView
            edges={["bottom"]}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "85%",
            }}
            accessibilityViewIsModal
          >
            <Row style={{ padding: 16, justifyContent: "space-between" }}>
              <Copy size={18} medium>
                {label}
              </Copy>
              <IconButton
                label="Cancel"
                onPress={() => setOpen(false)}
                icon={<X color={colors.ink} />}
              />
            </Row>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: o.value === value }}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: 14,
                    minHeight: 48,
                    borderRadius: 12,
                    backgroundColor:
                      o.value === value ? colors.brandFill : colors.canvas,
                  }}
                >
                  <Copy>{t(o.label) + (o.value === value ? " ✓" : "")}</Copy>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
export function IconButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  const { colors, t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  back = false,
  refresh,
  busy = false,
  tabs = false,
  maxWidth = 680,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  refresh?: () => void;
  busy?: boolean;
  tabs?: boolean;
  maxWidth?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const playerLayout = usePlayerLayout();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={busy}
                onRefresh={refresh}
                tintColor={colors.brand}
              />
            ) : undefined
          }
          contentContainerStyle={[
            {
              width: "100%",
              maxWidth,
              alignSelf: "center",
              padding: 16,
              gap: 16,
              paddingBottom:
                (tabs ? playerLayout.dockHeight + 36 : 24) +
                insets.bottom +
                playerLayout.playerHeight +
                (playerLayout.playerHeight ? 16 : 0),
            },
            contentContainerStyle,
          ]}
        >
          {back ? (
            <IconButton
              label="Back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              icon={<ArrowLeft size={20} color={colors.ink} />}
            />
          ) : null}
          {title ? <Heading>{title}</Heading> : null}
          {!online ? (
            <Card>
              <Copy muted>
                You are offline. Saved information may be outdated. Reconnect to
                save changes.
              </Copy>
            </Card>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Money({
  value,
  currency,
  sign = "",
  size = 26,
}: {
  value: string | null | undefined;
  currency: string;
  sign?: string;
  size?: number;
}) {
  const { locale, colors } = useTheme();
  const { hidden } = usePrivacy();
  return (
    <Copy
      medium
      size={size}
      style={{
        fontVariant: ["tabular-nums"],
        color:
          sign === "+"
            ? colors.income
            : sign === "−"
              ? colors.expense
              : colors.ink,
      }}
    >
      {hidden ? "••••" : sign + formatMoney(value, currency, locale)}
    </Copy>
  );
}
export function ErrorRetry({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Card>
      <Copy>{humanError(error)}</Copy>
      {retry ? <Button secondary label="Retry" onPress={retry} /> : null}
    </Card>
  );
}
export function Loading() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      style={{ padding: 16, gap: 16 }}
    >
      <ActivityIndicator color={colors.brand} />
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              height: 14,
              width: "45%",
              backgroundColor: colors.border,
              borderRadius: 6,
            }}
          />
          <View
            style={{
              height: i === 0 ? 48 : 24,
              width: "80%",
              backgroundColor: colors.border,
              borderRadius: 6,
            }}
          />
        </View>
      ))}
    </View>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: {
    isPending: boolean;
    error: unknown;
    data: unknown;
    refetch: () => unknown;
  };
  children: React.ReactNode;
}) {
  if (query.isPending) return <Loading />;
  if (query.error && !query.data)
    return (
      <ErrorRetry
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const saved = query.data as
    { __offline?: boolean; __capturedAt?: string } | undefined;
  return (
    <>
      {saved?.__offline ? (
        <Card>
          <Copy>Read-only saved data</Copy>
          <Copy
            muted
          >{`Captured: ${saved.__capturedAt ?? "unavailable"}`}</Copy>
        </Card>
      ) : null}
      {query.error ? (
        <ErrorRetry
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {children}
    </>
  );
}
export function Empty({
  message = "No records yet",
  action,
  label,
}: {
  message?: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <Card>
      <Copy muted>{message}</Copy>
      {action && label ? <Button label={label} onPress={action} /> : null}
    </Card>
  );
}
export function ConfirmSheet({
  visible,
  title,
  message,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const heading = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        try {
          const id = findNodeHandle(heading.current);
          if (id) AccessibilityInfo.setAccessibilityFocus(id);
        } catch {
          // ignore if unavailable on native
        }
      } else {
        try {
          (heading.current as any)?.focus?.();
        } catch {
          // ignore on web
        }
      }
    }
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000060",
        }}
      >
        <SafeAreaView
          edges={["bottom"]}
          accessibilityViewIsModal
          style={{
            padding: 24,
            gap: 16,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            width: "100%",
            maxWidth: 520,
            alignSelf: "center",
          }}
        >
          <View ref={heading} accessible>
            <Copy size={22} medium>
              {title}
            </Copy>
          </View>
          <Copy>{message}</Copy>
          <Button danger label="Confirm" onPress={onConfirm} busy={busy} />
          <Button secondary label="Cancel" onPress={onCancel} disabled={busy} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
const Toast = createContext((message: string) => {
  void message;
});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const { colors } = useTheme();
  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <Toast.Provider value={setMessage}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 70,
            left: 24,
            right: 24,
            padding: 14,
            borderRadius: 16,
            backgroundColor: colors.brandFill,
          }}
        >
          <Copy>{message}</Copy>
        </View>
      ) : null}
    </Toast.Provider>
  );
}
export const useToast = () => useContext(Toast);
export const styles = StyleSheet.create({
  gap: { gap: 12 },
  flex: { flex: 1 },
});

export function ConflictRecovery({
  error,
  onReload,
}: {
  error: unknown;
  onReload?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (
    !onReload ||
    !(error instanceof Error) ||
    !("status" in error) ||
    error.status !== 409
  )
    return null;
  return (
    <>
      <Button
        secondary
        label="Reload latest record"
        onPress={() => setOpen(true)}
      />
      <ConfirmSheet
        visible={open}
        title="Discard draft and reload?"
        message="Your draft stays until you confirm. Reloading replaces it with the latest server record."
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setBusy(true);
          void onReload().finally(() => {
            setBusy(false);
            setOpen(false);
          });
        }}
      />
    </>
  );
}
