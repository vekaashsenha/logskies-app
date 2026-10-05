import React, { type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWorkspace } from "../../ConnectedApp";
export const colors = {
  green: "#527C27",
  ink: "#20302A",
  muted: "#65736C",
  border: "#E1E8E0",
  pale: "#EFF5E8",
  background: "#F5F7F4",
  amber: "#805B13",
};
export function Icon({
  name,
  size = 22,
  color = colors.green,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: React.ComponentProps<typeof Ionicons>["color"];
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      {icon && <Icon name={icon} color={secondary ? colors.green : "white"} />}
      <Text style={[styles.buttonText, secondary && { color: colors.green }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function Heading({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Body({ children }: PropsWithChildren) {
  return <Text style={styles.body}>{children}</Text>;
}
export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}
export function Badge({
  text,
  warning = false,
}: {
  text: string;
  warning?: boolean;
}) {
  return (
    <View style={[styles.badge, warning && { backgroundColor: "#FFF4DC" }]}>
      <Text
        style={{
          color: warning ? colors.amber : colors.green,
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}
export function Row({
  title,
  subtitle,
  icon,
  onPress,
  selected,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && { borderColor: colors.green, backgroundColor: colors.pale },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.iconBox}>
        <Icon name={icon} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={styles.label}>{title}</Text>
        {!!subtitle && <Muted>{subtitle}</Muted>}
      </View>
      <Icon
        name={selected ? "checkmark-circle" : "chevron-forward"}
        size={20}
        color={selected ? colors.green : colors.muted}
      />
    </Pressable>
  );
}
export function Empty({
  title,
  description,
  action,
  onPress,
}: {
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Card>
      <View style={{ alignItems: "flex-start", gap: 12 }}>
        <Icon name="folder-open-outline" size={32} />
        <Heading>{title}</Heading>
        <Muted>{description}</Muted>
      </View>
      {!!action && onPress && (
        <Button title={action} onPress={onPress} secondary />
      )}
    </Card>
  );
}
export function Screen({
  title,
  subtitle,
  children,
  action,
  onAction,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}>) {
  const w = useWorkspace();
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.topline}>
            <View
              style={{ flexDirection: "row", gap: 7, alignItems: "center" }}
            >
              <Icon name="paper-plane" size={19} />
              <Text style={styles.brand}>LogSkies</Text>
            </View>
            {!!w.userId && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh shared records"
                disabled={w.busy || w.loading}
                onPress={() => void w.refresh()}
                style={styles.iconButton}
              >
                {w.loading ? (
                  <ActivityIndicator color={colors.green} />
                ) : (
                  <Icon name="refresh-outline" size={21} />
                )}
              </Pressable>
            )}
          </View>
          {w.preview && (
            <Badge text="UI PREVIEW · Example records only" warning />
          )}
          <View style={{ gap: 6 }}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Muted>{subtitle}</Muted>}
          </View>
          {!!action && onAction && <Button title={action} onPress={onAction} />}
          {!!w.message && (
            <View
              style={[
                styles.notice,
                w.isError && { backgroundColor: "#FFF1E9" },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="alert" style={styles.body}>
                  {w.message}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={w.clearMessage}
                style={styles.iconButton}
              >
                <Icon name="close" size={20} />
              </Pressable>
            </View>
          )}
          {w.loading && <Muted>Updating shared records…</Muted>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  topline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  brand: { color: colors.ink, fontWeight: "700", fontSize: 20 },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.6,
  },
  heading: { fontSize: 18, fontWeight: "600", color: colors.ink },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  body: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  label: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  button: {
    minHeight: 50,
    backgroundColor: colors.green,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondary: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    flexShrink: 1,
  },
  input: {
    color: colors.ink,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 50,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    padding: 16,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.pale,
    alignSelf: "flex-start",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.pale,
    padding: 14,
    borderRadius: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    flexGrow: 1,
    flexBasis: "44%",
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
    borderRadius: 16,
    gap: 8,
  },
  number: { fontSize: 28, fontWeight: "700", color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
});
