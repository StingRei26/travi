import { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share, Dimensions, Modal, TextInput,
  KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { TraviRow, Stop } from "@/lib/supabase";

const { width, height } = Dimensions.get("window");

// ── Constants ──────────────────────────────────────────────────────

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
const STOP_TYPES = [
  { type: "hotel",      emoji: "🏨", label: "Hotel",      dbType: "hotel" },
  { type: "dining",     emoji: "🍽️", label: "Dining",     dbType: "restaurant" },
  { type: "activity",   emoji: "🎯", label: "Activity",   dbType: "attraction" },
  { type: "experience", emoji: "✨", label: "Experience",  dbType: "experience" },
];

function parseCssGradient(css: string): [string, string] {
  const m = (css ?? "").match(/#[0-9a-fA-F]{3,8}/g);
  if (m && m.length >= 2) return [m[0], m[m.length - 1]];
  return ["#1a237e", "#4a148c"];
}

// ── Stop form state type ───────────────────────────────────────────

interface StopForm {
  name: string;
  location: string;
  type: string;
  rating: number;
  review: string;
  imageUris: string[];          // local URIs for new picks
  existingImageUrls: string[];  // already-uploaded URLs
}

const emptyForm = (): StopForm => ({
  name: "", location: "", type: "activity",
  rating: 5, review: "", imageUris: [], existingImageUrls: [],
});

interface LocResult { name: string; displayName: string; }

// ── Main component ─────────────────────────────────────────────────

export default function TraviDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [travi, setTravi] = useState<TraviRow | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  // Edit Travi modal
  const [editTraviOpen, setEditTraviOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingTravi, setSavingTravi] = useState(false);

  // Stop add / edit modal
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null); // null = new stop
  const [stopForm, setStopForm] = useState<StopForm>(emptyForm());
  const [savingStop, setSavingStop] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<LocResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const locDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Share / invite modal
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [shares, setShares] = useState<{ id: string; invited_email: string; accepted_at: string | null }[]>([]);

  // Photo lightbox
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  // Save stop to collection (non-owners)
  const [savedStopIds, setSavedStopIds] = useState<Set<string>>(new Set());
  const [savingStopId, setSavingStopId] = useState<string | null>(null);

  // ── Data fetch ─────────────────────────────────────────────────

  const fetchTravi = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("traviis")
      .select(`
        id, title, description, emoji, country, country_flag,
        cover_gradient, cover_image_url, tags, is_public,
        start_date, end_date, created_at, user_id,
        stops ( id, name, location, rating, type, emoji, order_index, date, review, image_urls )
      `)
      .eq("id", id)
      .single();

    if (error) console.error("Travi detail fetch error:", error.message);

    if (data) {
      // Fetch profile separately to avoid FK relationship dependency
      const { data: prof } = await supabase
        .from("profiles")
        .select("name, handle, avatar_url")
        .eq("id", data.user_id)
        .single();

      setTravi({ ...data, profiles: prof ?? null } as unknown as TraviRow);
      const sorted = [...(data.stops ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setStops(sorted as Stop[]);
      setIsOwner(user?.id === data.user_id);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTravi(); }, [id]);

  // ── Location autocomplete ──────────────────────────────────────

  const searchLocations = (q: string) => {
    setLocQuery(q);
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
        setLocResults(data.map((r: any) => ({
          name: r.name.split(",")[0].trim(),
          displayName: r.display_name.split(",").slice(0, 3).join(", "),
        })));
      } catch { setLocResults([]); }
      setLocSearching(false);
    }, 380);
  };

  // ── Edit Travi ─────────────────────────────────────────────────

  const openEditTravi = () => {
    setEditTitle(travi?.title ?? "");
    setEditDesc(travi?.description ?? "");
    setEditTraviOpen(true);
  };

  const saveEditTravi = async () => {
    if (!travi) return;
    setSavingTravi(true);
    await supabase.from("traviis").update({ title: editTitle, description: editDesc }).eq("id", travi.id);
    setTravi(t => t ? { ...t, title: editTitle, description: editDesc } : t);
    setSavingTravi(false);
    setEditTraviOpen(false);
  };

  // ── Add / edit stop ────────────────────────────────────────────

  const openAddStop = () => {
    setEditingStop(null);
    setStopForm(emptyForm());
    setLocQuery("");
    setLocResults([]);
    setStopModalOpen(true);
  };

  const openEditStop = (stop: Stop) => {
    setEditingStop(stop);
    setStopForm({
      name: stop.name,
      location: stop.location ?? "",
      type: stop.type,
      rating: stop.rating,
      review: stop.review ?? "",
      imageUris: [],
      existingImageUrls: stop.image_urls ?? [],
    });
    setLocQuery(stop.location ?? "");
    setLocResults([]);
    setStopModalOpen(true);
  };

  const pickStopImage = async () => {
    if (stopForm.imageUris.length + stopForm.existingImageUrls.length >= 3) {
      return Alert.alert("Max 3 photos", "Remove one before adding another.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) {
      setStopForm(f => ({ ...f, imageUris: [...f.imageUris, result.assets[0].uri] }));
    }
  };

  const uploadStopImages = async (uris: string[], userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const uri of uris) {
      const ext = uri.split(".").pop() ?? "jpg";
      const fileName = `${userId}/stops/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const ab = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage.from("travi-images").upload(fileName, ab, { contentType: `image/${ext}` });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("travi-images").getPublicUrl(fileName);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const saveStop = async () => {
    if (!stopForm.name.trim()) return Alert.alert("Missing name", "Give this stop a name.");
    if (!travi) return;
    setSavingStop(true);

    const { data: { user } } = await supabase.auth.getUser();
    const newUrls = user ? await uploadStopImages(stopForm.imageUris, user.id) : [];
    const allImageUrls = [...stopForm.existingImageUrls, ...newUrls];
    const cfg = STOP_TYPES.find(s => s.type === stopForm.type) ?? STOP_TYPES[2];
    const dbType = cfg.dbType;

    if (editingStop) {
      // Update existing stop
      const { data: updated } = await supabase
        .from("stops")
        .update({
          name: stopForm.name.trim(),
          location: stopForm.location.trim(),
          type: dbType,
          rating: stopForm.rating,
          review: stopForm.review.trim(),
          emoji: cfg.emoji,
          image_urls: allImageUrls,
        })
        .eq("id", editingStop.id)
        .select()
        .single();
      if (updated) {
        setStops(prev => prev.map(s => s.id === editingStop.id ? (updated as Stop) : s));
      }
    } else {
      // Insert new stop
      const { data: inserted } = await supabase
        .from("stops")
        .insert({
          travi_id: travi.id,
          name: stopForm.name.trim(),
          location: stopForm.location.trim(),
          type: dbType,
          rating: stopForm.rating,
          review: stopForm.review.trim(),
          emoji: cfg.emoji,
          image_urls: allImageUrls,
          order_index: stops.length,
        })
        .select()
        .single();
      if (inserted) setStops(prev => [...prev, inserted as Stop]);
    }

    setSavingStop(false);
    setStopModalOpen(false);
  };

  const deleteStop = (stopId: string) => {
    Alert.alert("Delete stop", "Remove this stop from your Travi?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("stops").delete().eq("id", stopId);
          setStops(prev => prev.filter(s => s.id !== stopId));
        },
      },
    ]);
  };

  // ── Share / invite ─────────────────────────────────────────────

  const openSharePanel = async () => {
    setShareOpen(true);
    if (!travi) return;
    const { data } = await supabase
      .from("travi_shares")
      .select("id, invited_email, accepted_at")
      .eq("travi_id", travi.id);
    if (data) setShares(data);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !travi) return;
    setInviting(true);
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: share, error } = await supabase
      .from("travi_shares")
      .insert({ travi_id: travi.id, inviter_id: currentUser?.id, invited_email: inviteEmail.trim().toLowerCase(), token })
      .select("id, invited_email, accepted_at")
      .single();
    if (!error && share) {
      const link = `https://travi-snowy.vercel.app/invite/${token}`;
      setLatestLink(link);
      setShares(prev => [...prev, share]);
      setInviteEmail("");
      // Open iOS share sheet with the link
      await Share.share({ message: `I shared a Travi with you! Open it here: ${link}` });
    }
    setInviting(false);
  };

  const shareLink = async () => {
    if (!travi) return;
    await Share.share({
      message: `Check out my ${travi.country} Travi: "${travi.title}" — https://travi-snowy.vercel.app/travi/${id}`,
      url: `https://travi-snowy.vercel.app/travi/${id}`,
    });
  };

  // ── Save stop to collection ────────────────────────────────────

  const saveStopToCollection = async (stop: Stop) => {
    setSavingStopId(stop.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingStopId(null); return; }

    const { error } = await supabase.from("saved_stops").insert({
      user_id: user.id,
      original_stop_id: stop.id,
      original_travi_id: id,
      name: stop.name,
      location: stop.location,
      rating: stop.rating,
      review: stop.review,
      type: stop.type,
      emoji: stop.emoji,
      image_url: stop.image_urls?.[0] ?? null,
      image_urls: stop.image_urls ?? [],
      source_user_name: travi?.profiles?.name ?? "Traveler",
      source_travi_title: travi?.title ?? "",
    });
    if (!error) setSavedStopIds(prev => new Set([...prev, stop.id]));
    setSavingStopId(null);
  };

  const unsaveStop = async (stopId: string) => {
    setSavingStopId(stopId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingStopId(null); return; }
    await supabase.from("saved_stops").delete().match({ user_id: user.id, original_stop_id: stopId });
    setSavedStopIds(prev => { const s = new Set(prev); s.delete(stopId); return s; });
    setSavingStopId(null);
  };

  // ── Privacy / delete ───────────────────────────────────────────

  const togglePrivacy = async () => {
    if (!travi) return;
    const next = !travi.is_public;
    await supabase.from("traviis").update({ is_public: next }).eq("id", travi.id);
    setTravi(t => t ? { ...t, is_public: next } : t);
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

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return <View style={styles.loadingScreen}><ActivityIndicator size="large" color="#c9a84c" /></View>;
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
  const filterTypes = ["all", ...Array.from(new Set(stops.map(s => s.type)))];
  const filteredStops = activeFilter === "all" ? stops : stops.filter(s => s.type === activeFilter);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Cover ── */}
        <View style={styles.cover}>
          {travi.cover_image_url
            ? <Image source={{ uri: travi.cover_image_url }} style={styles.coverImg} resizeMode="cover" />
            : <LinearGradient colors={colors} style={styles.coverImg} />}
          <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.75)"]} style={styles.coverOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.coverTopRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={shareLink}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.coverBottom}>
            <Text style={styles.coverEmoji}>{travi.emoji}</Text>
            <Text style={styles.coverTitle}>{travi.title}</Text>
            <Text style={styles.coverMeta}>{travi.country_flag} {travi.country}</Text>
          </View>
        </View>

        <View style={styles.body}>

          {/* ── Author row ── */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                : <Text style={styles.avatarText}>{(profile?.name ?? "T").charAt(0).toUpperCase()}</Text>}
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

          {/* ── Description ── */}
          {travi.description ? <Text style={styles.description}>{travi.description}</Text> : null}

          {/* ── Tags ── */}
          {travi.tags && travi.tags.length > 0 && (
            <View style={styles.tags}>
              {travi.tags.map((tag, i) => (
                <View key={`${tag}-${i}`} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}

          {/* ── Owner actions ── */}
          {isOwner && (
            <View style={styles.ownerActions}>
              <TouchableOpacity style={styles.ownerBtn} onPress={openEditTravi}>
                <Ionicons name="pencil-outline" size={14} color="#0f1729" />
                <Text style={styles.ownerBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ownerBtn} onPress={openSharePanel}>
                <Ionicons name="person-add-outline" size={14} color="#0f1729" />
                <Text style={styles.ownerBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ownerBtn} onPress={togglePrivacy}>
                <Ionicons name={travi.is_public ? "lock-closed-outline" : "globe-outline"} size={14} color="#0f1729" />
                <Text style={styles.ownerBtnText}>{travi.is_public ? "Make Private" : "Make Public"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ownerBtn, styles.ownerBtnDanger]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Stops section ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{stops.length} {stops.length === 1 ? "Stop" : "Stops"}</Text>
            {isOwner && (
              <TouchableOpacity style={styles.addStopBtn} onPress={openAddStop}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addStopBtnText}>Add Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stop type filter */}
          {stops.length > 0 && (
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
          )}

          {/* Stop cards */}
          {filteredStops.map((stop, i) => (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.timelineDot}>
                <View style={[styles.dot, { backgroundColor: TYPE_COLORS[stop.type] ?? "#9ca3af" }]} />
                {i < filteredStops.length - 1 && <View style={styles.dotLine} />}
              </View>
              <View style={styles.stopContent}>
                <View style={styles.stopTopRow}>
                  <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[stop.type] ?? "#9ca3af") + "18" }]}>
                    <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[stop.type] ?? "#9ca3af" }]}>
                      {TYPE_LABELS[stop.type] ?? stop.type}
                    </Text>
                  </View>
                  {isOwner && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity onPress={() => openEditStop(stop)}>
                        <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteStop(stop.id)}>
                        <Ionicons name="trash-outline" size={16} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={styles.stopName}>{stop.emoji} {stop.name}</Text>
                {stop.location ? <Text style={styles.stopLocation}>{stop.location}</Text> : null}
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
                      <TouchableOpacity key={j} onPress={() => setLightbox({ urls: stop.image_urls!, index: j })}>
                        <Image source={{ uri: url }} style={styles.stopPhoto} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {/* Save to collection (non-owners) */}
                {!isOwner && (
                  <TouchableOpacity
                    style={[styles.saveStopBtn, savedStopIds.has(stop.id) && styles.saveStopBtnSaved]}
                    onPress={() => savedStopIds.has(stop.id) ? unsaveStop(stop.id) : saveStopToCollection(stop)}
                    disabled={savingStopId === stop.id}
                  >
                    <Ionicons
                      name={savedStopIds.has(stop.id) ? "bookmark" : "bookmark-outline"}
                      size={13}
                      color={savedStopIds.has(stop.id) ? "#c9a84c" : "#9ca3af"}
                    />
                    <Text style={[styles.saveStopBtnText, savedStopIds.has(stop.id) && { color: "#c9a84c" }]}>
                      {savingStopId === stop.id ? "Saving…" : savedStopIds.has(stop.id) ? "Saved" : "Save to My Trip"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {stops.length === 0 && (
            <View style={styles.emptyStops}>
              <Text style={styles.emptyStopsEmoji}>📍</Text>
              <Text style={styles.emptyStopsText}>No stops yet</Text>
              {isOwner && (
                <TouchableOpacity style={styles.addStopBtnLarge} onPress={openAddStop}>
                  <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.addStopBtnLargeGrad}>
                    <Text style={styles.addStopBtnLargeText}>+ Add your first stop</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════
          MODAL: Edit Travi metadata
      ═══════════════════════════════════════════════ */}
      <Modal visible={editTraviOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditTraviOpen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Travi</Text>
            <TouchableOpacity onPress={saveEditTravi} disabled={savingTravi}>
              {savingTravi
                ? <ActivityIndicator color="#c9a84c" />
                : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="My Tokyo Travi"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textInput, { height: 100, textAlignVertical: "top" }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="What made this trip special?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════
          MODAL: Add / Edit Stop
      ═══════════════════════════════════════════════ */}
      <Modal visible={stopModalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setStopModalOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingStop ? "Edit Stop" : "Add Stop"}</Text>
              <TouchableOpacity onPress={saveStop} disabled={savingStop}>
                {savingStop
                  ? <ActivityIndicator color="#c9a84c" />
                  : <Text style={styles.modalSave}>Save</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">

              {/* Stop type picker */}
              <Text style={styles.fieldLabel}>TYPE</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {STOP_TYPES.map(st => (
                  <TouchableOpacity
                    key={st.type}
                    style={[styles.typeChip, stopForm.type === st.type && styles.typeChipActive]}
                    onPress={() => setStopForm(f => ({ ...f, type: st.type }))}
                  >
                    <Text style={{ fontSize: 16 }}>{st.emoji}</Text>
                    <Text style={[styles.typeChipText, stopForm.type === st.type && styles.typeChipTextActive]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.textInput}
                value={stopForm.name}
                onChangeText={v => setStopForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Park Hyatt Tokyo"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus={!editingStop}
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
                    setStopForm(f => ({ ...f, location: r.displayName }));
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

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>RATING</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setStopForm(f => ({ ...f, rating: n }))}>
                    <Ionicons name={n <= stopForm.rating ? "star" : "star-outline"} size={30} color="#c9a84c" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>REVIEW</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: "top" }]}
                value={stopForm.review}
                onChangeText={v => setStopForm(f => ({ ...f, review: v }))}
                placeholder="What did you think?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />

              {/* Photos */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>PHOTOS (up to 3)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {/* Existing uploaded photos */}
                {stopForm.existingImageUrls.map((url, i) => (
                  <View key={`ex-${i}`} style={styles.photoThumb}>
                    <Image source={{ uri: url }} style={styles.photoThumbImg} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setStopForm(f => ({ ...f, existingImageUrls: f.existingImageUrls.filter((_, j) => j !== i) }))}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* New picks */}
                {stopForm.imageUris.map((uri, i) => (
                  <View key={`new-${i}`} style={styles.photoThumb}>
                    <Image source={{ uri }} style={styles.photoThumbImg} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setStopForm(f => ({ ...f, imageUris: f.imageUris.filter((_, j) => j !== i) }))}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Add button */}
                {(stopForm.imageUris.length + stopForm.existingImageUrls.length) < 3 && (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickStopImage}>
                    <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                    <Text style={styles.photoAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════
          MODAL: Share / Invite
      ═══════════════════════════════════════════════ */}
      <Modal visible={shareOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShareOpen(false)}>
              <Text style={styles.modalCancel}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Travi</Text>
            <View style={{ width: 50 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">

              {/* Share link */}
              <TouchableOpacity style={styles.shareLinkBtn} onPress={shareLink}>
                <Ionicons name="link-outline" size={18} color="#c9a84c" />
                <Text style={styles.shareLinkText}>Share public link</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.divLine} />
                <Text style={styles.divLabel}>Invite by email</Text>
                <View style={styles.divLine} />
              </View>

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
                style={[styles.inviteBtn, inviting && { opacity: 0.6 }]}
                onPress={sendInvite}
                disabled={inviting}
              >
                <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.inviteBtnGrad}>
                  {inviting
                    ? <ActivityIndicator color="#0f1729" />
                    : <Text style={styles.inviteBtnText}>Send Invite</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {/* Current invites */}
              {shares.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 24 }]}>PEOPLE WITH ACCESS</Text>
                  {shares.map(s => (
                    <View key={s.id} style={styles.shareRow}>
                      <View style={styles.shareAvatar}>
                        <Text style={{ color: "#c9a84c", fontWeight: "700" }}>
                          {s.invited_email.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shareEmail}>{s.invited_email}</Text>
                        <Text style={styles.shareStatus}>
                          {s.accepted_at ? "✅ Accepted" : "⏳ Pending"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════
          LIGHTBOX: Full-screen photo viewer
      ═══════════════════════════════════════════════ */}
      <Modal visible={!!lightbox} animationType="fade" statusBarTranslucent>
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {lightbox && (
            <FlatList
              data={lightbox.urls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={lightbox.index}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
                  <Image source={{ uri: item }} style={{ width, height }} resizeMode="contain" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4" },
  loadingScreen: { flex: 1, backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center" },
  cover: { height: 300, position: "relative" },
  coverImg: { width: "100%", height: "100%" },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: "absolute", top: 16, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  coverTopRight: { position: "absolute", top: 16, right: 16, flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  coverBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  coverEmoji: { fontSize: 30, marginBottom: 4 },
  coverTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 3 },
  coverMeta: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  body: { padding: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f0ede8" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: "#c9a84c", fontSize: 15, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  authorHandle: { fontSize: 12, color: "#9ca3af" },
  date: { fontSize: 12, color: "#9ca3af" },
  description: { fontSize: 15, color: "#4b5563", lineHeight: 22, marginBottom: 14 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 18 },
  tag: { backgroundColor: "rgba(15,23,41,0.07)", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  ownerActions: { flexDirection: "row", gap: 8, marginBottom: 20 },
  ownerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 9, borderRadius: 10, backgroundColor: "rgba(15,23,41,0.07)",
  },
  ownerBtnDanger: { flex: 0, paddingHorizontal: 14, backgroundColor: "rgba(239,68,68,0.08)" },
  ownerBtnText: { fontSize: 12, fontWeight: "600", color: "#0f1729" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  addStopBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: "#0f1729",
  },
  addStopBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  filterBar: { marginBottom: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, marginRight: 8, backgroundColor: "#f0ede8" },
  filterPillActive: { backgroundColor: "#0f1729" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filterTextActive: { color: "#c9a84c" },
  stopCard: { flexDirection: "row", marginBottom: 20 },
  timelineDot: { width: 22, alignItems: "center", paddingTop: 4 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotLine: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginTop: 4 },
  stopContent: { flex: 1, paddingLeft: 10 },
  stopTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  stopName: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  stopLocation: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  starsRow: { flexDirection: "row", gap: 3, marginBottom: 6 },
  stopReview: { fontSize: 13, color: "#4b5563", lineHeight: 19, marginBottom: 8 },
  photoScroll: { marginTop: 4 },
  stopPhoto: { width: 110, height: 82, borderRadius: 10, marginRight: 8 },
  saveStopBtn: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8,
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: "rgba(0,0,0,0.04)",
  },
  saveStopBtnSaved: { backgroundColor: "rgba(201,168,76,0.1)" },
  saveStopBtnText: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  emptyStops: { alignItems: "center", paddingVertical: 40 },
  emptyStopsEmoji: { fontSize: 40, marginBottom: 10 },
  emptyStopsText: { fontSize: 16, color: "#9ca3af", fontWeight: "600", marginBottom: 20 },
  addStopBtnLarge: { borderRadius: 12, overflow: "hidden" },
  addStopBtnLargeGrad: { paddingVertical: 13, paddingHorizontal: 24 },
  addStopBtnLargeText: { fontSize: 15, fontWeight: "700", color: "#0f1729" },
  // Modals
  modalSafe: { flex: 1, backgroundColor: "#0f1729" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
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
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  typeChipActive: { backgroundColor: "rgba(201,168,76,0.15)", borderColor: "#c9a84c" },
  typeChipText: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  typeChipTextActive: { color: "#c9a84c" },
  locResult: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", marginTop: 6,
  },
  locResultName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  locResultSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8, position: "relative", overflow: "hidden" },
  photoThumbImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute", top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  photoAdd: {
    width: 80, height: 80, borderRadius: 10, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  photoAddText: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  shareLinkBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 14, backgroundColor: "rgba(201,168,76,0.1)",
    borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", marginBottom: 24,
  },
  shareLinkText: { flex: 1, color: "#c9a84c", fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  divLabel: { color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: "600" },
  inviteBtn: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  inviteBtnGrad: { paddingVertical: 14, alignItems: "center" },
  inviteBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1729" },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  shareAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(201,168,76,0.15)", alignItems: "center", justifyContent: "center" },
  shareEmail: { fontSize: 14, fontWeight: "600", color: "#fff" },
  shareStatus: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  lightboxBg: { flex: 1, backgroundColor: "#000" },
  lightboxClose: { position: "absolute", top: 52, right: 20, zIndex: 10, padding: 8 },
});
