import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, colors } from "../../components/field-ui";
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: colors.border,
          height: 72 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 16,
          minHeight: 16,
          flexShrink: 0,
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Icon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: "Fleet",
          tabBarIcon: ({ color }) => <Icon name="cube-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: () => (
            <View
              style={{
                backgroundColor: colors.green,
                borderRadius: 10,
                padding: 5,
              }}
            >
              <Icon name="scan-outline" color="white" size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="flights"
        options={{
          title: "Flights",
          tabBarIcon: ({ color }) => (
            <Icon name="paper-plane-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon name="ellipsis-horizontal-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
