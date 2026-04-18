import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { TraviRow, Stop } from "@/lib/supabase";

const { width } = Dimensions.get("window");

const TYPE_COLORS: Record<string, string> = {
  restaurant: "#f87171", hotel: "#60a5fa",
  attraction: "#34d399", experience: "#a78bfa",
  dining: "#f87171", activity: "#34d399",
};

const TYPE_LABELS: Record<string, string> = {
  restaurant: "🍽 Restaurant", hotel: "🏨 Hotel",
  attraction: "📍 Attraction", experience: "✨ Experience",
  dining: "🍽 Dining", activity: "🎯 Activity",
};

function parseCssGradient(css: string): [string, string] {
  const m = css.match(/#[0-9a-fA-F]{3,8}/g);
  if (m && m.length >= 2) return [m[0], m[m.length - 1]];
  return ["#1a237e", "#4a148c"];
}

export default function TraviDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [travi, setTravi] = useState<TraviRow | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("traviis")
        .select(`
          id, title, description, emoji, country, country_flag,
          cover_gradient, cover_image_url, tags, is_public,
          start_date, end_date, created_at, user_id,
          profiles ( name, handle, avatar_url ),
          stops ( id, name, location, rating, type, emoji, order_index, date, review, image_urls )
        `)
        .eq("id", id)
        .single();

      if (data) {
        setTravi(data as TraviRow);
        const sorted = [...(data.stops ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        setStops(sorted as Stop[]);
        setIsOwner(user?.id === data.user_id);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleShare = async () => {
    if (!travi) return;
    await Share.share({
      message: `Check out my ${travi.country} Travi: "${travi.title}" on Travi!`,
      url: `https://travi-snowy.vercel.app/travi/${id}`,
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Travi", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("traviis").delete().eq("id", id);
          router.replace("/(tabs)/my-traviis");
        },
      },
    ]);
  };

  const togglePrivacy = async () => {
    if (!travi) return;
    const newVal = !travi.is_public;
    await supabase.from("traviis").update({ is_public: newVal }).eq("id", travi.id);
    setTravi(t => t ? { ...t, is_public: newVal } : t);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  if (!travi) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Travi not found 😕</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#c9a84c", fontSize: 16 }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const colors = parseCssGradient(travi.cover_gradient ?? "");
  const profile = travi.profiles;
  const filterTypes = ["all", ...new Set(stops.map(s => s.type))];
  const filteredStops = activeFilter === "all" ? stops : stops.filter(s => s.type === activeFilter);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={styles.cover}>
          {travi.cover_image_url ? (
            <Image source={{ uri: travi.cover_image_url }} style={styles.coverImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={colors} style={styles.coverImg} />
          )}
          {/* Overlay gradient */}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.7)"]}
            style={styles.coverOverlay}
          />
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          {/* Share button */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
          {/* Title overlay */}
          <View style={styles.coverBottom}>
            <Text style={styles.coverEmoji}>{travi.emoji}</Text>
            <Text style={styles.coverTitle}>{travi.title}</Text>
            <Text style={styles.coverMeta}>{travi.country_flag} {travi.country}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{(profile?.name ?? "T").charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{profile?.name ?? "Traveler"}</Text>
              <Text style={styles.authorHandle}>{profile?.handle ?? "@traveler"}</Text>
            </View>
            {travi.start_date && (
              <Text style={styles.date}>
                {new Date(travi.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </Text>
            )}
          </View>

          {/* Description */}
          {travi.description ? (
            <Text style={styles.description}>{travi.description}</Text>
          ) : null}

          {/* Tags */}
          {travi.tags && travi.tags.length > 0 && (
            <View style={styles.tags}>
              {travi.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Owner actions */}
          {isOwner && (
            <View style={styles.ownerActions}>
              <TouchableOpacity style={styles.ownerBtn} onPress={togglePrivacy}>
                <Ionicons name={travi.is_public ? "globe-outline" : "lock-closed-outline"} size={14} color="#0f1729" />
                <Text style={styles.ownerBtnText}>{travi.is_public ? "Make Private" : "Make Public"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ownerBtn, styles.ownerBtnDanger]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={[styles.ownerBtnText, { color: "#ef4444" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stop filter */}
          {stops.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{stops.length} Stops</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                {filterTypes.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
                    onPress={() => setActiveFilter(f)}
                  >
                    <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                      {f === "all" ? "All" : TYPE_LABELS[f] ?? f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Stops list */}
              {filteredStops.map((stop, i) => (
                <View key={stop.id} style={styles.stopCard}>
                  {/* Timeline dot */}
                  <View style={styles.timelineDot}>
                    <View style={[styles.dot, { backgroundColor: TYPE_COLORS[stop.type] ?? "#9ca3af" }]} />
                    {i < filteredStops.length - 1 && <View style={styles.dotLine} />}
                  </View>

                  <View style={styles.stopContent}>
                    {/* Type badge */}
                    <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[stop.type] ?? "#9ca3af") + "18" }]}>
                      <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[stop.type] ?? "#9ca3af" }]}>
                        {TYPE_LABELS[stop.type] ?? stop.type}
                      </Text>
                    </View>

                    <Text style={styles.stopName}>{stop.emoji} {stop.name}</Text>
                    {stop.location ? <Text style={styles.stopLocation}>{stop.location}</Text> : null}

                    {/* Stars */}
                    <View style={styles.starsRow}>
                      {[1,2,3,4,5].map(n => (
                        <Ionicons key={n} name={n <= stop.rating ? "star" : "star-outline"} size={14} color="#c9a84c" />
                      ))}
                    </View>

                    {stop.review ? <Text style={styles.stopReview}>{stop.review}</Text> : null}

                    {/* Stop photos */}
                    {stop.image_urls && stop.image_urls.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                        {stop.image_urls.map((url, j) => (
                          <Image key={j} source={{ uri: url }} style={styles.stopPhoto} resizeMode="cover" />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4" },
  loadingScreen: { flex: 1, backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center" },
  cover: { height: 320, position: "relative" },
  coverImg: { width: "100%", height: "100%" },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: "absolute", top: 16, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  shareBtn: {
    position: "absolute", top: 16, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  coverBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  coverEmoji: { fontSize: 32, marginBottom: 4 },
  coverTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  coverMeta: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  body: { padding: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f0ede8" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: "#c9a84c", fontSize: 16, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  authorHandle: { fontSize: 12, color: "#9ca3af" },
  date: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  description: { fontSize: 15, color: "#4b5563", lineHeight: 22, marginBottom: 16 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 },
  tag: { backgroundColor: "rgba(15,23,41,0.07)", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  ownerActions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  ownerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(15,23,41,0.07)",
  },
  ownerBtnDanger: { backgroundColor: "rgba(239,68,68,0.08)" },
  ownerBtnText: { fontSize: 13, fontWeight: "600", color: "#0f1729" },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  filterBar: { marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, marginRight: 8,
    backgroundColor: "#f0ede8",
  },
  filterPillActive: { backgroundColor: "#0f1729" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filterTextActive: { color: "#c9a84c" },
  stopCard: { flexDirection: "row", marginBottom: 20 },
  timelineDot: { width: 24, alignItems: "center", paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotLine: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginTop: 4 },
  stopContent: { flex: 1, paddingLeft: 12, paddingBottom: 8 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  stopName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  stopLocation: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  starsRow: { flexDirection: "row", gap: 3, marginBottom: 8 },
  stopReview: { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 8 },
  photoScroll: { marginTop: 4 },
  stopPhoto: { width: 120, height: 90, borderRadius: 10, marginRight: 8 },
});
