import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

function CreateButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push("/plan")}
      style={styles.createBtn}
      activeOpacity={0.85}
    >
      <View style={styles.createBtnInner}>
        <Ionicons name="add" size={28} color="#0f1729" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f1729",
          borderTopColor: "rgba(255,255,255,0.08)",
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
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-placeholder"
        options={{
          title: "",
          tabBarButton: () => <CreateButton />,
        }}
      />
      <Tabs.Screen
        name="my-traviis"
        options={{
          title: "My Travis",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    top: -20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  createBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#c9a84c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#c9a84c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
