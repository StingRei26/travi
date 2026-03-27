import { notFound } from "next/navigation";
import { mockTraviis } from "@/lib/mockData";
import { createClient } from "@/lib/supabase/server";
import TraviDetailClient from "./TraviDetailClient";

export interface DisplayStop {
  id: string;
  emoji: string;
  type: string;
  rating: number;
  name: string;
  location: string;
  date: string;
  review: string;
  imageUrls: string[];
}

export interface DisplayTravi {
  title: string;
  emoji: string;
  country: string;
  coverGradient: string;
  coverImageUrl?: string | null;
  description: string;
  author: { name: string; handle: string; avatar: string };
  stats: { likes: number; saves: number; views: number; comments: number };
  startDate: string;
  endDate: string;
  stops: DisplayStop[];
  tags: string[];
}

export default async function TraviDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let travi: DisplayTravi | null = null;
  let isOwner = false;
  let isPublic = true;

  // ── Try Supabase first ──
  try {
    const supabase = await createClient();

    // Get current user to determine ownership
    const { data: { user } } = await supabase.auth.getUser();

    const { data: dbTravi } = await supabase
      .from("traviis")
      .select("*, stops(*)")
      .eq("id", id)
      .single();

    if (dbTravi) {
      isOwner = !!(user && user.id === dbTravi.user_id);
      isPublic = dbTravi.is_public ?? true;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, handle, avatar")
        .eq("id", dbTravi.user_id)
        .single();

      const sortedStops: DisplayStop[] = (dbTravi.stops ?? [])
        .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((s: {
          id: string; emoji: string; type: string; rating: number;
          name: string; location: string; created_at: string; review: string;
          image_url?: string | null; image_urls?: string[] | null;
        }) => ({
          id: s.id,
          emoji: s.emoji ?? "📍",
          type: s.type ?? "attraction",
          rating: s.rating ?? 5,
          name: s.name,
          location: s.location ?? "",
          date: s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          review: s.review ?? "",
          imageUrls: Array.isArray(s.image_urls) && s.image_urls.length > 0
            ? s.image_urls
            : s.image_url ? [s.image_url] : [],
        }));

      travi = {
        title: dbTravi.title,
        emoji: dbTravi.emoji ?? "🌍",
        country: dbTravi.country ?? "",
        coverGradient: dbTravi.cover_gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        coverImageUrl: dbTravi.cover_image_url,
        description: dbTravi.description ?? `A Travi in ${dbTravi.country ?? "the world"}.`,
        author: {
          name: profile?.name ?? "Travi User",
          handle: profile?.handle ?? "@traveler",
          avatar: (profile?.name ?? "T")[0].toUpperCase(),
        },
        stats: { likes: 0, saves: 0, views: 0, comments: 0 },
        startDate: dbTravi.start_date ?? "",
        endDate: dbTravi.end_date ?? "",
        stops: sortedStops,
        tags: dbTravi.tags ?? [],
      };
    }
  } catch {
    // Supabase unavailable — fall through to mock data
  }

  // ── Fall back to mock data ──
  if (!travi) {
    const mock = mockTraviis.find((t) => t.id === id);
    if (!mock) notFound();
    travi = {
      title: mock.title,
      emoji: mock.emoji,
      country: mock.country,
      coverGradient: mock.coverGradient,
      description: mock.description,
      author: mock.author,
      stats: mock.stats,
      startDate: mock.startDate,
      endDate: mock.endDate,
      stops: mock.stops.map((s) => ({ ...s, imageUrls: [] })),
      tags: mock.tags,
    };
  }

  if (!travi) notFound();

  return <TraviDetailClient travi={travi} id={id} isOwner={isOwner} initialIsPublic={isPublic} />;
}
