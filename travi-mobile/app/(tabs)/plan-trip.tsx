import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { TripPlan } from "@/lib/supabase";

const GRADIENTS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#fa709a", "#fee140"],
  ["#43e97b", "#38f9d7"],
  ["#a18cd1", "#fbc2eb"],
];

const CSS_GRADIENT_POOL = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

function parseCssGradient(css: string): [string, string] {
  const m = (css ?? "").match(/#[0-9a-fA-F]{3,8}/g);
  if (m && m.length >= 2) return [m[0], m[m.length - 1]];
  return ["#667eea", "#764ba2"];
}

export default function PlanTripTab() {
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadTripPlans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setRefreshing(false); return; }
    setUserId(user.id);

    const { data: ownedPlans } = await supabase
      .from("trip_plans")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const { data: collabRows } = await supabase
      .from("trip_plan_collaborators")
      .select("trip_plan_id")
      .eq("user_id", user.id);

    let allPlans: TripPlan[] = ownedPlans ?? [];

    if (collabRows && collabRows.length > 0) {
      const ids = collabRows.map((c: { trip_plan_id: string }) => c.trip_plan_id);
      const { data: sharedPlans } = await supabase
        .from("trip_plans")
        .select("*")
        .in("id", ids);
      if (sharedPlans) allPlans = [...allPlans, ...sharedPlans];
    }

    for (const plan of allPlans) {
      const { count: collabCount } = await supabase
        .from("trip_plan_collaborators")
        .select("*", { count: "exact", head: true })
        .eq("trip_plan_id", plan.id);
      const { count: stopCount } = await supabase
        .from("trip_plan_stops")
        .select("*", { count: "exact", head: true })
        .eq("trip_plan_id", plan.id);
      plan.collaborator_count = collabCount ?? 0;
      plan.stop_count = stopCount ?? 0;
    }

    setTripPlans(allPlans);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadTripPlans(); }, []);
  const onRefresh = () => { setRefreshing(true); loadTripPlans(); };

  const createPlan = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const gradient = CSS_GRADIENT_POOL[Math.floor(Math.random() * CSS_GRADIENT_POOL.length)];
    const { data, error } = await supabase
      .from("trip_plans")
      .insert({
        owner_id: user.id,
        title: newTitle.trim(),
        destination: newDestination.trim() || null,
        cover_gradient: gradient,
      })
      .select()
      .single();

    if (!error && data) {
      setShowNewModal(false);
      setNewTitle("");
      setNewDestination("");
      router.push(`/plan-trip/${data.id}`);
    }
    setCreating(false);
  };

  const deletePlan = (id: string, isOwner: boolean) => {
    if (!isOwner) return;
    Alert.alert("Delete Plan", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("trip_plans").delete().eq("id", id);
          setTripPlans(prev => prev.filter(p => p.id !== id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient colors={["#050d1a", "#0f1729"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="map" size={24} color="#c9a84c" />
          <Text style={styles.headerTitle}>Plan a Trip</Text>
        </View>
        <Text style={styles.headerSub}>Plan your next adventure solo or with friends</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={tripPlans}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a84c" />}
          ListHeaderComponent={
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewModal(true)}>
              <Ionicons name="add" size={22} color="#c9a84c" />
              <Text style={styles.newBtnText}>Start a New Trip Plan</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>✈️</Text>
              <Text style={styles.emptyTitle}>No trip plans yet</Text>
              <Text style={styles.emptySub}>
                Start planning your next adventure! Create a trip plan and invite friends to collaborate.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const [c1, c2] = parseCssGradient(item.cover_gradient);
            const isOwner = item.owner_id === userId;
            return (
              <TouchableOpacity
                style={styles.planCard}
                onPress={() => router.push(`/plan-trip/${item.id}`)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[c1, c2]} style={styles.planGrad}>
                  <Text style={styles.planFlag}>{item.country_flag ?? "🌍"}</Text>
                </LinearGradient>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.planMeta}>
                    {item.destination ? (
                      <Text style={styles.planMetaText}>📍 {item.destination}</Text>
                    ) : null}
                    <Text style={styles.planMetaText}>
                      👥 {(item.collaborator_count ?? 0) + 1} · {item.stop_count ?? 0} stops
                    </Text>
                  </View>
                </View>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deletePlan(item.id, isOwner)}
                  >
                    <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* New Plan Modal */}
      <Modal visible={showNewModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowNewModal(false); setNewTitle(""); setNewDestination(""); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Trip Plan</Text>
            <TouchableOpacity onPress={createPlan} disabled={!newTitle.trim() || creating}>
              {creating
                ? <ActivityIndicator color="#c9a84c" />
                : <Text style={[styles.modalSave, !newTitle.trim() && { opacity: 0.4 }]}>Create</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>TRIP NAME *</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Summer Europe Trip 2026"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>DESTINATION (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={newDestination}
              onChangeText={setNewDestination}
              placeholder="e.g. Italy, Japan, Multiple countries..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050d1a" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050d1a" },
  list: { padding: 16 },
  newBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    padding: 20, borderRadius: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: "rgba(201,168,76,0.4)",
    backgroundColor: "rgba(201,168,76,0.06)",
  },
  newBtnText: { color: "#c9a84c", fontSize: 16, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 20 },
  planCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14, marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  planGrad: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  planFlag: { fontSize: 22 },
  planInfo: { flex: 1, minWidth: 0 },
  planTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  planMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planMetaText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  deleteBtn: { padding: 6 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: "#0f1729" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalCancel: { color: "rgba(255,255,255,0.55)", fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  modalSave: { color: "#c9a84c", fontSize: 16, fontWeight: "700" },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 8 },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: 15,
  },
});
