import { createClient } from "@/lib/supabase/server";
import { mockTraviis, type Travi } from "@/lib/mockData";
import ExploreClient from "./ExploreClient";

// ── Gradient pool for traviis that have no cover image ──────────────────────
const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToTravi(row: any, idx: number): Travi {
  const profile = row.profiles ?? { name: "Traveler", handle: "@traveler" };
  const stops = (row.stops ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({
      id: s.id,
      name: s.name ?? "Stop",
      location: s.location ?? "",
      date: s.date ?? "",
      rating: s.rating ?? 5,
      review: s.review ?? "",
      type: (s.type ?? "attraction") as Travi["stops"][0]["type"],
      emoji: s.emoji ?? "📍",
    }));

  return {
    id: row.id,
    title: row.title ?? "Untitled Travi",
    description: row.description ?? "",
    coverGradient: row.cover_gradient ?? GRADIENTS[idx % GRADIENTS.length],
    coverImageUrl: row.cover_image_url ?? undefined,
    emoji: row.emoji ?? "🌍",
    country: row.country ?? "World",
    countryFlag: row.country_flag ?? "🌍",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    isPublic: true,
    tags: row.tags ?? [],
    author: {
      name: profile.name ?? "Traveler",
      avatar: (profile.name ?? "T").charAt(0).toUpperCase(),
      handle: profile.handle ?? "@traveler",
    },
    stats: { views: 0, likes: 0, saves: 0, comments: 0 },
    stops,
  };
}

export default async function ExplorePage() {
  let traviis: Travi[] = [];

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("traviis")
      .select(
        `
        id, title, description, emoji, country, country_flag,
        cover_gradient, cover_image_url, tags, created_at,
        profiles ( name, handle ),
        stops ( id, name, location, rating, type, emoji, order_index, date, review )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      traviis = data.map((row, idx) => dbRowToTravi(row, idx));
    }
  } catch {
    // Supabase not configured or network error — fall through to mock data
  }

  // If no real data yet, show mock traviis so the page isn't empty
  if (traviis.length === 0) {
    traviis = mockTraviis;
  }

  return <ExploreClient traviis={traviis} />;
}
