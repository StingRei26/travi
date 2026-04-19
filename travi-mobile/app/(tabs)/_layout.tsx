import { Tabs } from "expo-router";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f1729",
          borderTopColor: "rgba(201,168,76,0.15)",
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#c9a84c",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="my-traviis"
        options={{
          title: "My Travis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan-trip"
        options={{
          title: "Plan Trip",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-placeholder"
        options={{
          title: "New Travi",
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => router.push("/plan")}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingBottom: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.35)" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.35)" }}>
                New Travi
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
