import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { TripPlan, TripPlanStop, TripPlanCollaborator } from "@/lib/supabase";

const STOP_TYPES = ["landmark", "restaurant", "activity", "hotel", "shopping", "other"];
const STOP_EMOJIS: Record<string, string> = {
  landmark: "📍", restaurant: "🍽️", activity: "🎯",
  hotel: "🏨", shopping: "🛍️", other: "⭐",
};

function parseCssGradient(css: string): [string, string] {
  const m = (css ?? "").match(/#[0-9a-fA-F]{3,8}/g);
  if (m && m.length >= 2) return [m[0], m[m.length - 1]];
  return ["#667eea", "#764ba2"];
}

interface LocResult { name: string; displayName: string; }

export default function PlanTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [stops, setStops] = useState<TripPlanStop[]>([]);
  const [collaborators, setCollaborators] = useState<TripPlanCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Add stop modal
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [stopName, setStopName] = useState("");
  const [stopType, setStopType] = useState("landmark");
  const [stopLocation, setStopLocation] = useState("");
  const [stopNotes, setStopNotes] = useState("");
  const [savingStop, setSavingStop] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<LocResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const locDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: planData } = await supabase
      .from("trip_plans")
      .select("*")
      .eq("id", id)
      .single();

    if (planData) {
      setPlan(planData as TripPlan);
      setIsOwner(user.id === planData.owner_id);
    }

    const { data: stopsData } = await supabase
      .from("trip_plan_stops")
      .select("*")
      .eq("trip_plan_id", id)
      .order("order_index", { ascending: true });

    if (stopsData) {
      // Enrich with added_by names
      const enriched = await Promise.all(
        (stopsData as TripPlanStop[]).map(async (stop) => {
          if (stop.added_by) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", stop.added_by)
              .single();
            return { ...stop, added_by_name: prof?.name ?? "Someone" };
          }
          return stop;
        })
      );
      setStops(enriched);
    }

    const { data: collabData } = await supabase
      .from("trip_plan_collaborators")
      .select("*")
      .eq("trip_plan_id", id);

    if (collabData) {
      const enriched = await Promise.all(
        (collabData as TripPlanCollaborator[]).map(async (c) => {
          if (c.user_id) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", c.user_id)
              .single();
            return { ...c, user_name: prof?.name ?? c.invited_email ?? "Collaborator" };
          }
          return { ...c, user_name: c.invited_email ?? "Pending" };
        })
      );
      setCollaborators(enriched);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const searchLocations = (q: string) => {
    setLocQuery(q);
    setStopLocation(q);
    if (locDebRef.current) clearTimeout(locDebRef.current);
    if (!q.trim()) { setLocResults([]); return; }
    setLocSearching(true);
    locDebRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data = await res.json();
        setLocResults(data.map((r: { name: string; display_name: string }) => ({
          name: r.name.split(",")[0].trim(),
          displayName: r.display_name.split(",").slice(0, 3).join(", "),
        })));
      } catch { setLocResults([]); }
      setLocSearching(false);
    }, 380);
  };

  const addStop = async () => {
    if (!stopName.trim() || !id) return;
    setSavingStop(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingStop(false); return; }

    const { data: inserted } = await supabase
      .from("trip_plan_stops")
      .insert({
        trip_plan_id: id,
        added_by: user.id,
        name: stopName.trim(),
        location: stopLocation.trim() || null,
        type: stopType,
        notes: stopNotes.trim() || null,
        order_index: stops.length,
      })
      .select()
      .single();

    if (inserted) {
      const { data: prof } = await supabase
        .from("profiles").select("name").eq("id", user.id).single();
      setStops(prev => [...prev, { ...(inserted as TripPlanStop), added_by_name: prof?.name ?? "You" }]);
    }

    setSavingStop(false);
    setAddStopOpen(false);
    setStopName("");
    setStopType("landmark");
    setStopLocation("");
    setStopNotes("");
    setLocQuery("");
    setLocResults([]);
  };

  const deleteStop = (stopId: string) => {
    Alert.alert("Remove Stop", "Remove this stop from the plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await supabase.from("trip_plan_stops").delete().eq("id", stopId);
          setStops(prev => prev.filter(s => s.id !== stopId));
        },
      },
    ]);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !id) return;
    setInviting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviting(false); return; }

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data: collab, error } = await supabase
      .from("trip_plan_collaborators")
      .insert({
        trip_plan_id: id,
        invited_email: inviteEmail.trim().toLowerCase(),
        invite_token: token,
        status: "pending",
      })
      .select()
      .single();

    if (!error && collab) {
      setCollaborators(prev => [...prev, { ...(collab as TripPlanCollaborator), user_name: inviteEmail.trim() }]);
      setInviteEmail("");
    }
    setInviting(false);
  };

  const deletePlan = () => {
    Alert.alert("Delete Plan", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("trip_plans").delete().eq("id", id);
          router.replace("/(tabs)/plan-trip");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Plan not found 😕</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#c9a84c", fontSize: 16 }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const [c1, c2] = parseCssGradient(plan.cover_gradient);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[c1, c2]} style={styles.hero}>
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.deleteHeroBtn} onPress={deletePlan}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
          <View style={styles.heroContent}>
            <Text style={styles.heroFlag}>{plan.country_flag ?? "🌍"}</Text>
            <Text style={styles.heroTitle}>{plan.title}</Text>
            {plan.destination && (
              <Text style={styles.heroSub}>📍 {plan.destination}</Text>
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{stops.length}</Text>
              <Text style={styles.statLabel}>Stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{collaborators.length + 1}</Text>
              <Text style={styles.statLabel}>People</Text>
            </View>
            {plan.planned_date && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>📅</Text>
                  <Text style={styles.statLabel}>{plan.planned_date}</Text>
                </View>
              </>
            )}
          </View>

          {/* Stops section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stops ({stops.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddStopOpen(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add Stop</Text>
            </TouchableOpacity>
          </View>

          {stops.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={() => setAddStopOpen(true)}>
              <Text style={styles.emptyCardEmoji}>📍</Text>
              <Text style={styles.emptyCardText}>Add your first stop</Text>
            </TouchableOpacity>
          ) : (
            stops.map((stop, i) => (
              <View key={stop.id} style={styles.stopCard}>
                <View style={styles.stopIndex}>
                  <Text style={styles.stopIndexText}>{i + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <View style={styles.stopRow}>
                    <Text style={styles.stopEmoji}>{STOP_EMOJIS[stop.type] ?? "📍"}</Text>
                    <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(stop.type) + "18" }]}>
                      <Text style={[styles.typeBadgeText, { color: getTypeColor(stop.type) }]}>{stop.type}</Text>
                    </View>
                  </View>
                  {stop.location ? <Text style={styles.stopLocation}>{stop.location}</Text> : null}
                  {stop.notes ? <Text style={styles.stopNotes}>{stop.notes}</Text> : null}
                  {stop.added_by_name && (
                    <Text style={styles.addedBy}>Added by {stop.added_by_name}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => deleteStop(stop.id)} style={styles.deleteStopBtn}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Collaborators section */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>People ({collaborators.length + 1})</Text>
            {isOwner && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setInviteOpen(true)}>
                <Ionicons name="person-add-outline" size={14} color="#fff" />
                <Text style={styles.addBtnText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Owner row */}
          <View style={styles.collaboratorRow}>
            <View style={styles.collabAvatar}>
              <Text style={styles.collabAvatarText}>👑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.collabName}>You (Owner)</Text>
            </View>
          </View>

          {collaborators.map(c => (
            <View key={c.id} style={styles.collaboratorRow}>
              <View style={styles.collabAvatar}>
                <Text style={styles.collabAvatarText}>
                  {(c.user_name ?? c.invited_email ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collabName}>{c.user_name ?? c.invited_email}</Text>
                <Text style={styles.collabStatus}>
                  {c.status === "accepted" ? "✅ Accepted" : "⏳ Pending invite"}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Add Stop Modal */}
      <Modal visible={addStopOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setAddStopOpen(false); setStopName(""); setStopLocation(""); setStopNotes(""); setLocQuery(""); setLocResults([]); }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Stop</Text>
              <TouchableOpacity onPress={addStop} disabled={!stopName.trim() || savingStop}>
                {savingStop
                  ? <ActivityIndicator color="#c9a84c" />
                  : <Text style={[styles.modalSave, !stopName.trim() && { opacity: 0.4 }]}>Add</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Type picker */}
              <Text style={styles.fieldLabel}>TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {STOP_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, stopType === t && styles.typeChipActive]}
                    onPress={() => setStopType(t)}
                  >
                    <Text style={{ fontSize: 14 }}>{STOP_EMOJIS[t]}</Text>
                    <Text style={[styles.typeChipText, stopType === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>NAME *</Text>
              <TextInput
                style={styles.textInput}
                value={stopName}
                onChangeText={setStopName}
                placeholder="e.g. Colosseum"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>LOCATION</Text>
              <TextInput
                style={styles.textInput}
                value={locQuery}
                onChangeText={searchLocations}
                placeholder="Search location…"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              {locSearching && <ActivityIndicator color="#c9a84c" style={{ marginTop: 8 }} />}
              {locResults.map(r => (
                <TouchableOpacity
                  key={r.displayName}
                  style={styles.locResult}
                  onPress={() => {
                    setStopLocation(r.displayName);
                    setLocQuery(r.displayName);
                    setLocResults([]);
                  }}
                >
                  <Ionicons name="location-outline" size={14} color="#9ca3af" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locResultName}>{r.name}</Text>
                    <Text style={styles.locResultSub} numberOfLines={1}>{r.displayName}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>NOTES (optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                value={stopNotes}
                onChangeText={setStopNotes}
                placeholder="Any notes about this stop?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={inviteOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setInviteOpen(false); setInviteEmail(""); }}>
              <Text style={styles.modalCancel}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite Collaborator</Text>
            <View style={{ width: 50 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{ padding: 20 }}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@example.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.inviteBtn, (!inviteEmail.trim() || inviting) && { opacity: 0.5 }]}
                onPress={sendInvite}
                disabled={!inviteEmail.trim() || inviting}
              >
                <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.inviteBtnGrad}>
                  {inviting
                    ? <ActivityIndicator color="#0f1729" />
                    : <Text style={styles.inviteBtnText}>Send Invite</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {collaborators.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 24 }]}>CURRENT COLLABORATORS</Text>
                  {collaborators.map(c => (
                    <View key={c.id} style={styles.collaboratorRow}>
                      <View style={styles.collabAvatar}>
                        <Text style={styles.collabAvatarText}>
                          {(c.user_name ?? "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.collabName}>{c.user_name ?? c.invited_email}</Text>
                        <Text style={styles.collabStatus}>
                          {c.status === "accepted" ? "✅ Accepted" : "⏳ Pending"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    landmark: "#34d399", restaurant: "#f87171", activity: "#60a5fa",
    hotel: "#a78bfa", shopping: "#fbbf24", other: "#9ca3af",
  };
  return colors[type] ?? "#9ca3af";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4" },
  loadingScreen: { flex: 1, backgroundColor: "#050d1a", alignItems: "center", justifyContent: "center" },
  hero: { height: 220, position: "relative" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  backBtn: {
    position: "absolute", top: 16, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  deleteHeroBtn: {
    position: "absolute", top: 16, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  heroFlag: { fontSize: 28, marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 2 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  body: { padding: 20 },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1729", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20, marginBottom: 24,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, fontWeight: "500" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.12)" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: "#0f1729",
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  emptyCard: {
    alignItems: "center", paddingVertical: 30, borderRadius: 14,
    borderWidth: 1.5, borderColor: "rgba(201,168,76,0.3)", borderStyle: "dashed",
    backgroundColor: "rgba(201,168,76,0.04)",
  },
  emptyCardEmoji: { fontSize: 32, marginBottom: 8 },
  emptyCardText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
  stopCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 8,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e7e5e0",
  },
  stopIndex: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stopIndexText: { fontSize: 11, fontWeight: "800", color: "#c9a84c" },
  stopInfo: { flex: 1 },
  stopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  stopEmoji: { fontSize: 14 },
  stopName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  stopLocation: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  stopNotes: { fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 2 },
  addedBy: { fontSize: 11, color: "#c9a84c", marginTop: 4, fontWeight: "600" },
  deleteStopBtn: { padding: 4, flexShrink: 0 },
  collaboratorRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  collabAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(15,23,41,0.08)", alignItems: "center", justifyContent: "center" },
  collabAvatarText: { fontSize: 14, fontWeight: "700", color: "#0f1729" },
  collabName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  collabStatus: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  // Modals
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
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  typeChipActive: { backgroundColor: "rgba(201,168,76,0.15)", borderColor: "#c9a84c" },
  typeChipText: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  typeChipTextActive: { color: "#c9a84c" },
  locResult: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", marginTop: 6,
  },
  locResultName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  locResultSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  inviteBtn: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  inviteBtnGrad: { paddingVertical: 14, alignItems: "center" },
  inviteBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1729" },
});
