import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import TraviCard from "@/components/TraviCard";
import { supabase } from "@/lib/supabase";
import type { TraviRow, Profile } from "@/lib/supabase";

export default function MyTraviisScreen() {
  const [traviis, setTraviis] = useState<TraviRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [sharedTraviis, setSharedTraviis] = useState<TraviRow[]>([]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, name, handle, avatar_url")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    // Fetch my traviis
    const { data: myData } = await supabase
      .from("traviis")
      .select(`
        id, title, description, emoji, country, country_flag,
        cover_gradient, cover_image_url, tags, is_public,
        start_date, end_date, created_at, user_id,
        stops ( id, name, location, rating, type, emoji, order_index )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (myData) setTraviis(myData.map(t => ({
      ...t,
      profiles: { name: prof?.name ?? "You", handle: prof?.handle ?? "@you", avatar_url: prof?.avatar_url ?? null },
    })) as TraviRow[]);

    // Fetch shared traviis
    const { data: shareData } = await supabase
      .from("travi_shares")
      .select("travi_id")
      .eq("accepted_by", user.id);

    if (shareData && shareData.length > 0) {
      const ids = shareData.map(s => s.travi_id);
      const { data: sharedData } = await supabase
        .from("traviis")
        .select(`
          id, title, description, emoji, country, country_flag,
          cover_gradient, cover_image_url, tags, is_public,
          start_date, end_date, created_at, user_id,
          profiles ( name, handle, avatar_url ),
          stops ( id, name, location, rating, type, emoji, order_index )
        `)
        .in("id", ids);
      if (sharedData) setSharedTraviis(sharedData as TraviRow[]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Travi", "This can't be undone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("traviis").delete().eq("id", id);
          setTraviis(prev => prev.filter(t => t.id !== id));
        },
      },
    ]);
  };

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uri = result.assets[0].uri;
    const ext = uri.split(".").pop() ?? "jpg";
    const fileName = `${user.id}/avatar.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("travi-images")
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("travi-images")
        .getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    }
    setUploadingAvatar(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/sign-in");
  };

  const displayTraviis = tab === "mine" ? traviis : sharedTraviis;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={["#0f1729", "#1a2744"]} style={styles.header}>
        <View style={styles.headerRow}>
          {/* Avatar */}
          <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarWrap}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#c9a84c" />
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitial}>
                {(profile?.name ?? "T").charAt(0).toUpperCase()}
              </Text>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={10} color="#0f1729" />
            </View>
          </TouchableOpacity>

          {/* Name + handle */}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.name ?? "Traveler"}</Text>
            <Text style={styles.profileHandle}>{profile?.handle ?? "@you"}</Text>
          </View>

          {/* Sign out */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{traviis.length}</Text>
            <Text style={styles.statLabel}>Travis</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {[...new Set(traviis.map(t => t.country))].length}
            </Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {traviis.reduce((acc, t) => acc + (t.stops?.length ?? 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Stops</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["mine", "shared"] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "mine" ? "My Travis" : `Shared (${sharedTraviis.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={displayTraviis}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a84c" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{tab === "mine" ? "✈️" : "🤝"}</Text>
              <Text style={styles.emptyTitle}>
                {tab === "mine" ? "No Travis yet" : "Nothing shared yet"}
              </Text>
              <Text style={styles.emptySub}>
                {tab === "mine"
                  ? "Tap + to create your first Travi"
                  : "When someone shares a Travi with you, it'll appear here"}
              </Text>
              {tab === "mine" && (
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/plan")}>
                  <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.createBtnGrad}>
                    <Text style={styles.createBtnText}>+ Create Travi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View>
              <TraviCard travi={item} />
              {tab === "mine" && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/travi/${item.id}`)}
                  >
                    <Ionicons name="pencil-outline" size={14} color="#0f1729" />
                    <Text style={styles.editBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4" },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#0f1729", borderWidth: 2, borderColor: "#c9a84c",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarInitial: { fontSize: 22, fontWeight: "800", color: "#c9a84c" },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#c9a84c", alignItems: "center", justifyContent: "center",
  },
  profileName: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  profileHandle: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  signOutBtn: { padding: 6 },
  stats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, fontWeight: "500" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },
  tabRow: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e7e5e0",
  },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: "#c9a84c" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#0f1729" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#374151", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  createBtn: { borderRadius: 14, overflow: "hidden" },
  createBtnGrad: { paddingVertical: 14, paddingHorizontal: 28 },
  createBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1729" },
  cardActions: { flexDirection: "row", gap: 10, marginTop: -12, marginBottom: 20, paddingHorizontal: 4 },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: "rgba(15,23,41,0.07)",
  },
  editBtnText: { fontSize: 13, fontWeight: "600", color: "#0f1729" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
});
