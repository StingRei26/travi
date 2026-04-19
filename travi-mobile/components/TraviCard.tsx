import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { TraviRow } from "@/lib/supabase";

const { width } = Dimensions.get("window");

// Parse a CSS gradient string into an array of hex colours for LinearGradient.
// Falls back to a safe navy-purple pair if parsing fails.
function parseCssGradient(css: string): [string, string] {
  const matches = css.match(/#[0-9a-fA-F]{3,8}/g);
  if (matches && matches.length >= 2) return [matches[0], matches[matches.length - 1]];
  return ["#1a237e", "#4a148c"];
}

interface Props {
  travi: TraviRow;
  onPress?: () => void;
}

export default function TraviCard({ travi, onPress }: Props) {
  const colors = parseCssGradient(travi.cover_gradient ?? "");
  const authorName = travi.profiles?.name ?? "Traveler";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const stopCount = travi.stops?.length ?? 0;

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/travi/${travi.id}`);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.92}>
      {/* Cover */}
      <View style={styles.cover}>
        {travi.cover_image_url ? (
          <Image source={{ uri: travi.cover_image_url }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={colors} style={styles.coverImg} />
        )}
        {/* Emoji badge */}
        <View style={styles.emojiBadge}>
          <Text style={{ fontSize: 22 }}>{travi.emoji}</Text>
        </View>
        {/* Privacy badge */}
        {!travi.is_public && (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.8)" />
            <Text style={styles.privateBadgeText}>Private</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{travi.title}</Text>
        <Text style={styles.country}>{travi.country_flag} {travi.country}</Text>

        {travi.description ? (
          <Text style={styles.desc} numberOfLines={2}>{travi.description}</Text>
        ) : null}

        {/* Tags */}
        {travi.tags && travi.tags.length > 0 && (
          <View style={styles.tags}>
            {travi.tags.slice(0, 3).map((tag, i) => (
              <View key={`${tag}-${i}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {travi.profiles?.avatar_url ? (
                <Image source={{ uri: travi.profiles.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{authorInitial}</Text>
              )}
            </View>
            <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="location-outline" size={13} color="#9ca3af" />
            <Text style={styles.statText}>{stopCount} {stopCount === 1 ? "stop" : "stops"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  cover: { height: 180, position: "relative" },
  coverImg: { width: "100%", height: "100%" },
  emojiBadge: {
    position: "absolute", bottom: 12, left: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  privateBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4,
  },
  privateBadgeText: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600" },
  body: { padding: 16 },
  title: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 3, letterSpacing: -0.3 },
  country: { fontSize: 13, color: "#6b7280", marginBottom: 8, fontWeight: "500" },
  desc: { fontSize: 13, color: "#4b5563", lineHeight: 18, marginBottom: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: {
    backgroundColor: "rgba(15,23,41,0.07)",
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#0f1729", alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: 28, height: 28, borderRadius: 14 },
  avatarText: { color: "#c9a84c", fontSize: 12, fontWeight: "700" },
  authorName: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
});
