import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WorkspaceProvider, useWorkspace } from "../../ConnectedApp";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WorkspaceProvider>
        <StatusBar style="dark" />
        <Navigation />
      </WorkspaceProvider>
    </SafeAreaProvider>
  );
}
function Navigation() {
  const { ready, userId } = useWorkspace();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F7F4",
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Loading account"
          color="#527C27"
        />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F7F4" },
      }}
    >
      <Stack.Protected guard={!userId}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!!userId}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="flight/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
