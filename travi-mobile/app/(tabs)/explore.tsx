import { useEffect, useState, useMemo } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import TraviCard from "@/components/TraviCard";
import { supabase } from "@/lib/supabase";
import type { TraviRow } from "@/lib/supabase";

export default function ExploreScreen() {
  const [traviis, setTraviis] = useState<TraviRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");

  const fetchTraviis = async () => {
    const { data, error } = await supabase
      .from("traviis")
      .select(`
        id, title, description, emoji, country, country_flag,
        cover_gradient, cover_image_url, tags, is_public,
        start_date, end_date, created_at, user_id,
        stops ( id, name, location, rating, type, emoji, order_index )
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Explore fetch error:", error.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles separately — avoids FK relationship dependency
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      setTraviis(data.map(t => ({
        ...t,
        profiles: profileMap.get(t.user_id) ?? null,
      })) as unknown as TraviRow[]);
    } else {
      setTraviis([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTraviis(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchTraviis(); };

  // Dynamic tags from real data
  const tags = useMemo(() => {
    const set = new Set<string>();
    traviis.forEach(t => {
      set.add(t.country);
      (t.tags ?? []).forEach(tag => set.add(tag));
    });
    return ["All", ...Array.from(set).sort().slice(0, 10)];
  }, [traviis]);

  const filtered = useMemo(() => {
    return traviis.filter(t => {
      const q = query.toLowerCase();
      const matchQ = !q
        || t.title.toLowerCase().includes(q)
        || t.country.toLowerCase().includes(q)
        || (t.description ?? "").toLowerCase().includes(q)
        || (t.tags ?? []).some(tag => tag.toLowerCase().includes(q));
      const matchTag = activeTag === "All" || t.country === activeTag || (t.tags ?? []).includes(activeTag);
      return matchQ && matchTag;
    });
  }, [traviis, query, activeTag]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={["#0f1729", "#1a2744"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="compass" size={24} color="#c9a84c" />
          <Text style={styles.headerTitle}>Explore Travis</Text>
        </View>
        <Text style={styles.headerSub}>Discover real trip journals from around the world</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 14 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destinations…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={{ marginRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tag filter bar */}
      <View style={styles.tagBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagPill, activeTag === tag && styles.tagPillActive]}
              onPress={() => setActiveTag(tag)}
            >
              <Text style={[styles.tagText, activeTag === tag && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c9a84c" />}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {filtered.length} {filtered.length === 1 ? "Travi" : "Travis"}
              {activeTag !== "All" ? ` in ${activeTag}` : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>
                {traviis.length === 0 ? "No Travis yet" : "No results"}
              </Text>
              <Text style={styles.emptySub}>
                {traviis.length === 0
                  ? "Be the first to share your journey!"
                  : "Try a different search or tag"}
              </Text>
            </View>
          }
          renderItem={({ item }) => <TraviCard travi={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4", overflow: "hidden" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 18 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 15, paddingVertical: 12, paddingRight: 4 },
  tagBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e7e5e0" },
  tagScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tagPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    backgroundColor: "#f0ede8",
  },
  tagPillActive: { backgroundColor: "#0f1729" },
  tagText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  tagTextActive: { color: "#c9a84c" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  countText: { fontSize: 13, color: "#9ca3af", marginBottom: 16 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
});
