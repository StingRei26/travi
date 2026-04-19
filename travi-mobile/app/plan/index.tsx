import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
  FlatList, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────

type StopType = "hotel" | "dining" | "activity" | "experience";
type Step = "destination" | "cover" | "stops" | "review";

interface SearchResult {
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  displayName: string;
}

interface NominatimResult {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    county?: string;
    country?: string;
    road?: string;
    house_number?: string;
  };
}

interface StopDraft {
  id: string;
  type: StopType;
  name: string;
  location: string;
  rating: number;
  review: string;
  emoji: string;
  photos: string[];  // local URIs before upload
}

const STOP_TYPES: { type: StopType; emoji: string; label: string; color: string }[] = [
  { type: "hotel",      emoji: "🏨", label: "Hotel",      color: "#60a5fa" },
  { type: "dining",     emoji: "🍽️", label: "Dining",     color: "#f87171" },
  { type: "activity",   emoji: "🎯", label: "Activity",   color: "#34d399" },
  { type: "experience", emoji: "✨", label: "Experience", color: "#a78bfa" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
];

const FLAG_MAP: Record<string, string> = {
  "United States": "🇺🇸", "Japan": "🇯🇵", "France": "🇫🇷", "Italy": "🇮🇹",
  "Spain": "🇪🇸", "United Kingdom": "🇬🇧", "Australia": "🇦🇺", "Canada": "🇨🇦",
  "Germany": "🇩🇪", "Mexico": "🇲🇽", "Thailand": "🇹🇭", "Indonesia": "🇮🇩",
  "Philippines": "🇵🇭", "Greece": "🇬🇷", "Portugal": "🇵🇹", "Brazil": "🇧🇷",
};

const EMPTY_STOP: Omit<StopDraft, "id"> = {
  type: "activity", name: "", location: "", rating: 5, review: "", emoji: "📍", photos: [],
};

// ── Upload helper ──────────────────────────────────────────────────

async function uploadImage(uri: string, path: string): Promise<string | null> {
  try {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${path}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const { error } = await supabase.storage
      .from("travi-images")
      .upload(filePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("travi-images").getPublicUrl(filePath);
    return publicUrl;
  } catch {
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function PlanScreen() {
  const [step, setStep] = useState<Step>("destination");

  // Destination search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<SearchResult | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);

  // Trip info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Cover
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverGradient, setCoverGradient] = useState(COVER_GRADIENTS[0]);

  // Stops
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [addingType, setAddingType] = useState<StopType | null>(null);
  const [newStop, setNewStop] = useState<Omit<StopDraft, "id">>(EMPTY_STOP);

  // Stop location autocomplete
  const [stopLocQuery, setStopLocQuery] = useState("");
  const [stopLocResults, setStopLocResults] = useState<{ label: string; displayName: string }[]>([]);
  const [stopLocSearching, setStopLocSearching] = useState(false);
  const stopLocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop photos (local URIs during creation)
  const [newStopPhotos, setNewStopPhotos] = useState<string[]>([]);

  // Lightbox
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Publish
  const [publishing, setPublishing] = useState(false);

  // ── Effects ────────────────────────────────────────────────────

  // Detect user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
      });
      if (geo[0]) setUserCity(`${geo[0].city ?? geo[0].subregion ?? ""}, ${geo[0].country ?? ""}`);
    })();
  }, []);

  // Destination search (Nominatim)
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data.map(r => ({
          name: r.address?.city ?? r.address?.town ?? r.address?.county ?? r.name.split(",")[0],
          country: r.address?.country ?? "",
          flag: FLAG_MAP[r.address?.country ?? ""] ?? "🌍",
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          displayName: r.display_name,
        })));
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Stop location autocomplete (Nominatim)
  useEffect(() => {
    if (stopLocTimerRef.current) clearTimeout(stopLocTimerRef.current);
    if (!stopLocQuery.trim() || stopLocQuery === newStop.location) {
      setStopLocResults([]);
      return;
    }
    stopLocTimerRef.current = setTimeout(async () => {
      setStopLocSearching(true);
      try {
        const q = destination
          ? `${stopLocQuery}, ${destination.name}, ${destination.country}`
          : stopLocQuery;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: NominatimResult[] = await res.json();
        setStopLocResults(data.map(r => {
          const parts = r.display_name.split(",").slice(0, 3).map(s => s.trim());
          return { label: parts.join(", "), displayName: r.display_name };
        }));
      } catch { setStopLocResults([]); }
      setStopLocSearching(false);
    }, 400);
    return () => {
      if (stopLocTimerRef.current) clearTimeout(stopLocTimerRef.current);
    };
  }, [stopLocQuery]);

  // ── Handlers ───────────────────────────────────────────────────

  const selectDestination = (r: SearchResult) => {
    setDestination(r);
    setTitle(`My ${r.name} Travi`);
    setResults([]);
    setQuery(r.name + ", " + r.country);
    setStep("cover");
  };

  const pickCoverPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const pickStopPhoto = async () => {
    if (newStopPhotos.length >= 3) {
      Alert.alert("Max 3 photos", "You can add up to 3 photos per stop.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) {
      setNewStopPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeStopPhoto = (idx: number) => {
    setNewStopPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const selectStopLocation = (label: string) => {
    setNewStop(p => ({ ...p, location: label }));
    setStopLocQuery(label);
    setStopLocResults([]);
  };

  const addStop = () => {
    if (!newStop.name.trim()) return Alert.alert("Missing name", "Give this stop a name.");
    const cfg = STOP_TYPES.find(s => s.type === (addingType ?? "activity"))!;
    setStops(prev => [...prev, {
      ...newStop,
      id: Date.now().toString(),
      type: addingType ?? "activity",
      emoji: cfg.emoji,
      photos: newStopPhotos,
    }]);
    setAddingType(null);
    setNewStop(EMPTY_STOP);
    setNewStopPhotos([]);
    setStopLocQuery("");
    setStopLocResults([]);
  };

  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id));

  const handlePublish = async () => {
    if (!destination) return Alert.alert("No destination", "Please pick a destination first.");
    if (stops.length === 0) return Alert.alert("No stops", "Add at least one stop to your Travi.");

    setPublishing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPublishing(false); return; }

    // Upload cover image
    let coverImageUrl: string | null = null;
    if (coverUri) {
      const ext = coverUri.split(".").pop() ?? "jpg";
      coverImageUrl = await uploadImage(coverUri, `${user.id}/covers/${Date.now()}`);
    }

    // Insert travi
    const startDate = month && year
      ? `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-01`
      : null;

    const { data: travi, error: traviErr } = await supabase
      .from("traviis")
      .insert({
        user_id: user.id,
        title: title || `My ${destination.name} Travi`,
        description,
        emoji: destination.flag,
        country: destination.country,
        country_flag: destination.flag,
        cover_gradient: coverGradient,
        cover_image_url: coverImageUrl,
        tags: [destination.country, destination.name],
        is_public: isPublic,
        start_date: startDate,
      })
      .select("id")
      .single();

    if (traviErr || !travi) {
      setPublishing(false);
      return Alert.alert("Error", "Failed to save your Travi. Please try again.");
    }

    // Insert stops (with photo uploads)
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];

      // Upload stop photos
      const uploadedUrls: string[] = [];
      for (let j = 0; j < s.photos.length; j++) {
        const url = await uploadImage(
          s.photos[j],
          `${user.id}/stops/${travi.id}/${Date.now()}_${j}`
        );
        if (url) uploadedUrls.push(url);
      }

      await supabase.from("stops").insert({
        travi_id: travi.id,
        name: s.name,
        location: s.location || `${destination.name}, ${destination.country}`,
        rating: s.rating,
        review: s.review,
        type: s.type === "dining" ? "restaurant" : s.type,
        emoji: s.emoji,
        order_index: i,
        image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      });
    }

    setPublishing(false);
    Alert.alert("Travi saved! ✈️", `Your ${destination.name} Travi is ready.`, [
      { text: "View it", onPress: () => router.replace(`/travi/${travi.id}`) },
      { text: "Go to My Travis", onPress: () => router.replace("/(tabs)/my-traviis") },
    ]);
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>New Travi</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {(["destination", "cover", "stops", "review"] as Step[]).map((s, i) => {
          const idx = ["destination","cover","stops","review"].indexOf(step);
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                i < idx && styles.stepDotDone,
              ]} />
              <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
                {["Destination","Cover","Stops","Review"][i]}
              </Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >

          {/* ── STEP 1: Destination ── */}
          {step === "destination" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Where did you go? ✈️</Text>
              {userCity && (
                <View style={styles.locPill}>
                  <View style={styles.locDot} />
                  <Text style={styles.locText}>📍 You're near {userCity}</Text>
                </View>
              )}
              <TextInput
                style={styles.searchBox}
                placeholder="Search city or country…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {searching && <ActivityIndicator color="#c9a84c" style={{ marginTop: 12 }} />}
              {results.map(r => (
                <TouchableOpacity
                  key={r.displayName}
                  style={styles.resultRow}
                  onPress={() => selectDestination(r)}
                >
                  <Text style={styles.resultFlag}>{r.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <Text style={styles.resultCountry}>{r.country}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── STEP 2: Cover & Details ── */}
          {step === "cover" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>{destination?.flag} {destination?.name}</Text>

              <Text style={styles.fieldLabel}>TRIP TITLE</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="My Tokyo Adventure"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                placeholder="What made this trip special?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>WHEN WAS THIS TRIP?</Text>
              <View style={styles.dateRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {MONTHS.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.datePill, month === m && styles.datePillActive]}
                        onPress={() => setMonth(m)}
                      >
                        <Text style={[styles.datePillText, month === m && styles.datePillTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {YEARS.slice(0, 5).map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.datePill, year === y && styles.datePillActive]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[styles.datePillText, year === y && styles.datePillTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>COVER PHOTO</Text>
              <TouchableOpacity style={styles.coverPicker} onPress={pickCoverPhoto}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.coverPreview} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.coverPreview}>
                    <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.coverPickerText}>Tap to add a cover photo</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Make this Travi public</Text>
                  <Text style={styles.toggleSub}>Others can discover it on Explore</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, isPublic && styles.toggleOn]}
                  onPress={() => setIsPublic(v => !v)}
                >
                  <View style={[styles.toggleThumb, isPublic && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep("stops")}>
                <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.nextBtnGrad}>
                  <Text style={styles.nextBtnText}>Next: Add Stops →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Stops ── */}
          {step === "stops" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Add your stops</Text>
              <Text style={styles.stepSub}>Hotels, restaurants, activities — what did you do?</Text>

              {/* Existing stops */}
              {stops.map(s => (
                <View key={s.id} style={styles.stopCard}>
                  <View style={styles.stopHeader}>
                    <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>{s.name}</Text>
                      <Text style={styles.stopLocation}>{s.location || destination?.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeStop(s.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.starsRow}>
                    {[1,2,3,4,5].map(n => (
                      <Ionicons key={n} name={n <= s.rating ? "star" : "star-outline"} size={14} color="#c9a84c" />
                    ))}
                  </View>
                  {s.review ? (
                    <Text style={styles.stopReview} numberOfLines={2}>{s.review}</Text>
                  ) : null}
                  {/* Stop photo thumbnails */}
                  {s.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {s.photos.map((uri, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => { setLightboxPhotos(s.photos); setLightboxIdx(idx); }}
                          >
                            <Image source={{ uri }} style={styles.stopPhotoThumb} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </View>
              ))}

              {/* Add stop form */}
              {addingType ? (
                <View style={styles.addStopForm}>
                  <Text style={styles.fieldLabel}>STOP NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newStop.name}
                    onChangeText={v => setNewStop(p => ({ ...p, name: v }))}
                    placeholder={addingType === "hotel" ? "Park Hyatt Tokyo" : "Sukiyabashi Jiro"}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoFocus
                  />

                  {/* Stop location with Nominatim autocomplete */}
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>LOCATION</Text>
                  <TextInput
                    style={styles.textInput}
                    value={stopLocQuery}
                    onChangeText={v => {
                      setStopLocQuery(v);
                      setNewStop(p => ({ ...p, location: v }));
                    }}
                    placeholder={`${destination?.name ?? "City"}, ${destination?.country ?? "Country"}`}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  {stopLocSearching && (
                    <ActivityIndicator color="#c9a84c" size="small" style={{ marginTop: 6 }} />
                  )}
                  {stopLocResults.length > 0 && (
                    <View style={styles.autocompleteBox}>
                      {stopLocResults.map((r, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.autocompleteRow,
                            i < stopLocResults.length - 1 && styles.autocompleteRowBorder,
                          ]}
                          onPress={() => selectStopLocation(r.label)}
                        >
                          <Ionicons name="location-outline" size={14} color="#c9a84c" style={{ marginTop: 1 }} />
                          <Text style={styles.autocompleteText} numberOfLines={2}>{r.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>RATING</Text>
                  <View style={styles.starsRow}>
                    {[1,2,3,4,5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setNewStop(p => ({ ...p, rating: n }))}>
                        <Ionicons name={n <= newStop.rating ? "star" : "star-outline"} size={28} color="#c9a84c" />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>REVIEW</Text>
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                    value={newStop.review}
                    onChangeText={v => setNewStop(p => ({ ...p, review: v }))}
                    placeholder="What did you think?"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                  />

                  {/* Stop photos */}
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    PHOTOS ({newStopPhotos.length}/3)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {newStopPhotos.map((uri, idx) => (
                        <View key={idx} style={styles.photoSlot}>
                          <Image source={{ uri }} style={styles.photoSlotImg} />
                          <TouchableOpacity
                            style={styles.photoSlotRemove}
                            onPress={() => removeStopPhoto(idx)}
                          >
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {newStopPhotos.length < 3 && (
                        <TouchableOpacity style={styles.photoSlotAdd} onPress={pickStopPhoto}>
                          <Ionicons name="add" size={28} color="rgba(255,255,255,0.4)" />
                          <Text style={styles.photoSlotAddText}>Add photo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setAddingType(null);
                        setNewStop(EMPTY_STOP);
                        setNewStopPhotos([]);
                        setStopLocQuery("");
                        setStopLocResults([]);
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={addStop}>
                      <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.addBtnGrad}>
                        <Text style={styles.addBtnText}>Add Stop</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 12 }]}>ADD A STOP</Text>
                  <View style={styles.stopTypeGrid}>
                    {STOP_TYPES.map(st => (
                      <TouchableOpacity
                        key={st.type}
                        style={[styles.stopTypeBtn, { borderColor: st.color + "44" }]}
                        onPress={() => {
                          setAddingType(st.type);
                          setNewStop(p => ({ ...p, type: st.type, emoji: st.emoji }));
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{st.emoji}</Text>
                        <Text style={styles.stopTypeLabel}>{st.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {stops.length > 0 && !addingType && (
                <TouchableOpacity
                  style={[styles.nextBtn, { marginTop: 24 }]}
                  onPress={() => setStep("review")}
                >
                  <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.nextBtnGrad}>
                    <Text style={styles.nextBtnText}>Review & Save →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── STEP 4: Review & Publish ── */}
          {step === "review" && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeading}>Ready to save? ✈️</Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryEmoji}>{destination?.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryTitle}>{title}</Text>
                    <Text style={styles.summaryMeta}>{destination?.country}</Text>
                  </View>
                </View>
                {(month || year) && (
                  <Text style={styles.summaryDate}>{month} {year}</Text>
                )}
                <Text style={styles.summaryStops}>
                  {stops.length} stop{stops.length !== 1 ? "s" : ""}
                  {stops.reduce((acc, s) => acc + s.photos.length, 0) > 0
                    ? ` · ${stops.reduce((acc, s) => acc + s.photos.length, 0)} photo${stops.reduce((acc, s) => acc + s.photos.length, 0) !== 1 ? "s" : ""}`
                    : ""}
                </Text>
                <View style={[styles.publicBadge, isPublic ? styles.publicBadgeOn : styles.publicBadgeOff]}>
                  <Ionicons
                    name={isPublic ? "globe-outline" : "lock-closed-outline"}
                    size={12}
                    color={isPublic ? "#059669" : "#6b7280"}
                  />
                  <Text style={[styles.publicBadgeText, { color: isPublic ? "#059669" : "#6b7280" }]}>
                    {isPublic ? "Public" : "Private"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, publishing && { opacity: 0.6 }]}
                onPress={handlePublish}
                disabled={publishing}
              >
                <LinearGradient colors={["#c9a84c", "#e8c96a"]} style={styles.nextBtnGrad}>
                  {publishing
                    ? <ActivityIndicator color="#0f1729" />
                    : <Text style={styles.nextBtnText}>Save Travi ✈️</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 12 }]}
                onPress={() => setStep("stops")}
              >
                <Text style={styles.secondaryBtnText}>← Back to Stops</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo lightbox */}
      <Modal
        visible={lightboxPhotos.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxPhotos([])}
      >
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxPhotos([])}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={lightboxPhotos}
            horizontal
            pagingEnabled
            initialScrollIndex={lightboxIdx}
            getItemLayout={(_, index) => ({
              length: 400, offset: 400 * index, index,
            })}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={styles.lightboxSlide}>
                <Image source={{ uri: item }} style={styles.lightboxImg} resizeMode="contain" />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
          <Text style={styles.lightboxCounter}>
            {lightboxPhotos.length > 1 ? `Swipe to browse · ${lightboxPhotos.length} photos` : ""}
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1729" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  stepRow: { flexDirection: "row", paddingHorizontal: 20, gap: 0, marginBottom: 4 },
  stepItem: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  stepDotActive: { backgroundColor: "#c9a84c", transform: [{ scale: 1.3 }] },
  stepDotDone: { backgroundColor: "#34d399" },
  stepLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: "600" },
  stepLabelActive: { color: "#c9a84c" },
  scroll: { flex: 1 },
  stepContent: { padding: 20 },
  stepHeading: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 16 },
  stepSub: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 20, marginTop: -8 },
  locPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    backgroundColor: "rgba(100,220,100,0.09)", borderWidth: 1, borderColor: "rgba(100,220,100,0.3)",
    alignSelf: "flex-start", marginBottom: 16,
  },
  locDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  locText: { fontSize: 13, color: "rgba(200,255,200,0.85)", fontWeight: "500" },
  searchBox: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16, paddingVertical: 13, color: "#fff", fontSize: 15, marginBottom: 8,
  },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  resultFlag: { fontSize: 24 },
  resultName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  resultCountry: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: 15,
  },
  // Autocomplete dropdown
  autocompleteBox: {
    backgroundColor: "#1a2540", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginTop: 4, overflow: "hidden",
  },
  autocompleteRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  autocompleteRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  autocompleteText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18 },
  // Date pickers
  dateRow: { flexDirection: "row", marginBottom: 4 },
  datePill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  datePillActive: { backgroundColor: "rgba(201,168,76,0.2)", borderColor: "#c9a84c" },
  datePillText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  datePillTextActive: { color: "#c9a84c" },
  // Cover
  coverPicker: { borderRadius: 16, overflow: "hidden", height: 180, marginBottom: 20 },
  coverPreview: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 8 },
  coverPickerText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500" },
  // Toggle
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", marginBottom: 20,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#fff" },
  toggleSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", padding: 2,
  },
  toggleOn: { backgroundColor: "#c9a84c" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleThumbOn: { alignSelf: "flex-end" },
  // Buttons
  nextBtn: { borderRadius: 14, overflow: "hidden" },
  nextBtnGrad: { paddingVertical: 16, alignItems: "center" },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#0f1729" },
  secondaryBtn: {
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center",
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  addBtn: { flex: 2, borderRadius: 12, overflow: "hidden" },
  addBtnGrad: { paddingVertical: 13, alignItems: "center" },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#0f1729" },
  // Stop cards
  stopCard: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  stopHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  stopName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  stopLocation: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  starsRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  stopReview: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 18 },
  stopPhotoThumb: { width: 72, height: 56, borderRadius: 8 },
  addStopForm: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, marginTop: 4,
  },
  stopTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stopTypeBtn: {
    width: "47%", paddingVertical: 16, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 8, borderWidth: 1,
  },
  stopTypeLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  // Stop photos
  photoSlot: { position: "relative", width: 90, height: 72 },
  photoSlotImg: { width: 90, height: 72, borderRadius: 10 },
  photoSlotRemove: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: "#0f1729", borderRadius: 10,
  },
  photoSlotAdd: {
    width: 90, height: 72, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4,
  },
  photoSlotAddText: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
  // Summary
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  summaryEmoji: { fontSize: 36 },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  summaryMeta: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  summaryDate: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 4 },
  summaryStops: { fontSize: 13, color: "#c9a84c", fontWeight: "600", marginBottom: 12 },
  publicBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  publicBadgeOn: { backgroundColor: "rgba(5,150,105,0.1)", borderWidth: 1, borderColor: "rgba(5,150,105,0.3)" },
  publicBadgeOff: { backgroundColor: "rgba(107,114,128,0.1)", borderWidth: 1, borderColor: "rgba(107,114,128,0.3)" },
  publicBadgeText: { fontSize: 12, fontWeight: "600" },
  // Lightbox
  lightboxBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center", justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute", top: 56, right: 20, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, padding: 8,
  },
  lightboxSlide: {
    width: 400, height: "100%", alignItems: "center", justifyContent: "center",
  },
  lightboxImg: { width: "100%", height: 400 },
  lightboxCounter: {
    position: "absolute", bottom: 48,
    fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500",
  },
});
