import { notFound } from "next/navigation";
import Link from "next/link";
import { mockTraviis } from "@/lib/mockData";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Star, MapPin, Heart, Bookmark, Share2, Calendar, MessageCircle, ExternalLink } from "lucide-react";

interface DisplayStop {
  id: string;
  emoji: string;
  type: string;
  rating: number;
  name: string;
  location: string;
  date: string;
  review: string;
  imageUrl?: string | null;
}

interface DisplayTravi {
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

const typeColors: Record<string, string> = {
  restaurant: "#f87171",
  hotel: "#60a5fa",
  attraction: "#34d399",
  experience: "#a78bfa",
};

const typeLabels: Record<string, string> = {
  restaurant: "🍽 Restaurant",
  hotel: "🏨 Hotel",
  attraction: "📍 Attraction",
  experience: "✨ Experience",
};

export default async function TraviDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let travi: DisplayTravi | null = null;

  // ── Try Supabase first ──
  try {
    const supabase = await createClient();
    const { data: dbTravi } = await supabase
      .from("traviis")
      .select("*, stops(*)")
      .eq("id", id)
      .single();

    if (dbTravi) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, handle, avatar")
        .eq("id", dbTravi.user_id)
        .single();

      const sortedStops: DisplayStop[] = (dbTravi.stops ?? [])
        .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((s: {
          id: string; emoji: string; type: string; rating: number;
          name: string; location: string; created_at: string; review: string; image_url?: string | null;
        }) => ({
          id: s.id,
          emoji: s.emoji ?? "📍",
          type: s.type ?? "attraction",
          rating: s.rating ?? 5,
          name: s.name,
          location: s.location ?? "",
          date: s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          review: s.review ?? "",
          imageUrl: s.image_url,
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
      stops: mock.stops,
      tags: mock.tags,
    };
  }

  const heroStyle = travi.coverImageUrl
    ? {
        backgroundImage: `url(${travi.coverImageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        padding: "48px 24px 64px",
        position: "relative" as const,
        overflow: "hidden" as const,
      }
    : {
        background: travi.coverGradient,
        padding: "48px 24px 64px",
        position: "relative" as const,
        overflow: "hidden" as const,
      };

  return (
    <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
      {/* Hero Banner */}
      <div style={heroStyle}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "500", textDecoration: "none", marginBottom: "32px" }}>
            <ArrowLeft size={16} />
            Back to Explore
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "52px" }}>{travi.emoji}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={14} color="rgba(255,255,255,0.8)" />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "500" }}>{travi.country}</span>
                  </div>
                  <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: "800", color: "#ffffff", letterSpacing: "-1.5px", lineHeight: 1.1, marginTop: "4px" }}>
                    {travi.title}
                  </h1>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                  {travi.author.avatar}
                </div>
                <div>
                  <p style={{ color: "#ffffff", fontWeight: "600", fontSize: "14px" }}>{travi.author.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>{travi.author.handle}</p>
                </div>
              </div>

              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "16px", maxWidth: "560px", lineHeight: "1.65" }}>
                {travi.description}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <ActionBtn icon={<Heart size={16} />} label={`${travi.stats.likes} likes`} />
              <ActionBtn icon={<Bookmark size={16} />} label={`${travi.stats.saves} saves`} />
              <ActionBtn icon={<Share2 size={16} />} label="Share" accent />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "28px", marginTop: "32px", flexWrap: "wrap" }}>
            {(travi.startDate || travi.endDate) && (
              <StatPill icon="📅" label={`${travi.startDate}${travi.endDate ? ` → ${travi.endDate}` : ""}`} />
            )}
            <StatPill icon="📍" label={`${travi.stops.length} stop${travi.stops.length !== 1 ? "s" : ""}`} />
            {travi.stats.views > 0 && <StatPill icon="👁" label={`${travi.stats.views.toLocaleString()} views`} />}
            {travi.stats.comments > 0 && <StatPill icon="💬" label={`${travi.stats.comments} comments`} />}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", alignItems: "start" }} className="detail-grid">
          {/* Stops timeline */}
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f1729", letterSpacing: "-0.5px", marginBottom: "28px" }}>
              Trip Stops
            </h2>

            {travi.stops.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "15px" }}>No stops added yet.</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "23px", top: "0", bottom: "0", width: "2px", background: "linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0.1))", borderRadius: "1px" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {travi.stops.map((stop, i) => (
                    <div key={stop.id} style={{ display: "flex", gap: "20px", position: "relative" }}>
                      {/* Pin */}
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#ffffff", border: "3px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, boxShadow: "0 4px 12px rgba(201,168,76,0.3)", zIndex: 1 }}>
                        {stop.emoji}
                      </div>

                      {/* Card */}
                      <div style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        {stop.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={stop.imageUrl}
                            alt={stop.name}
                            style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
                          />
                        )}
                        <div style={{ padding: "20px 24px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "100px", backgroundColor: (typeColors[stop.type] ?? "#9ca3af") + "20", color: typeColors[stop.type] ?? "#9ca3af" }}>
                                  {typeLabels[stop.type] ?? stop.type}
                                </span>
                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Stop {i + 1}</span>
                              </div>
                              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f1729" }}>{stop.name}</h3>
                            </div>
                            <div style={{ display: "flex", gap: "2px", flexShrink: 0, marginTop: "4px" }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={14} fill={s <= stop.rating ? "#c9a84c" : "none"} color={s <= stop.rating ? "#c9a84c" : "#d1d5db"} />
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                            <MapPin size={12} color="#9ca3af" />
                            <span style={{ fontSize: "13px", color: "#9ca3af" }}>{stop.location}</span>
                            {stop.date && (
                              <>
                                <span style={{ color: "#d1d5db", margin: "0 4px" }}>·</span>
                                <Calendar size={12} color="#9ca3af" />
                                <span style={{ fontSize: "13px", color: "#9ca3af" }}>{stop.date}</span>
                              </>
                            )}
                          </div>

                          {stop.review && (
                            <p style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.65", fontStyle: "italic", borderLeft: "3px solid #c9a84c", paddingLeft: "14px" }}>
                              &ldquo;{stop.review}&rdquo;
                            </p>
                          )}

                          {/* Action row */}
                          <div style={{ display: "flex", gap: "16px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f0ede8" }}>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0 }}>
                              <Heart size={14} /> Helpful
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0 }}>
                              <MessageCircle size={14} /> Comment
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0, marginLeft: "auto" }}>
                              <ExternalLink size={14} /> Book
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            {/* Tags */}
            {travi.tags.length > 0 && (
              <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", padding: "20px 24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f1729", marginBottom: "14px" }}>Tags</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {travi.tags.map((tag) => (
                    <span key={tag} style={{ padding: "5px 12px", borderRadius: "100px", backgroundColor: "rgba(201,168,76,0.1)", color: "#b8962a", fontSize: "13px", fontWeight: "600" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            {travi.stats.views > 0 && (
              <div style={{ backgroundColor: "#0f1729", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "16px" }}>Travi Stats</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "Views", value: travi.stats.views.toLocaleString() },
                    { label: "Likes", value: travi.stats.likes },
                    { label: "Saves", value: travi.stats.saves },
                    { label: "Comments", value: travi.stats.comments },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px" }}>{s.label}</span>
                      <span style={{ color: "#c9a84c", fontWeight: "700", fontSize: "16px" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share CTA */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", padding: "20px 24px", textAlign: "center" }}>
              <Share2 size={28} color="#c9a84c" style={{ marginBottom: "12px" }} />
              <p style={{ fontWeight: "700", color: "#0f1729", fontSize: "15px", marginBottom: "6px" }}>Share this Travi</p>
              <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "16px" }}>Inspire others with this journey</p>
              <button style={{ width: "100%", padding: "11px", borderRadius: "10px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", border: "none", color: "#0f1729", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                Copy Share Link
              </button>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function ActionBtn({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", border: accent ? "none" : "1px solid rgba(255,255,255,0.25)", background: accent ? "linear-gradient(135deg, #c9a84c, #e8c96a)" : "rgba(255,255,255,0.1)", color: accent ? "#0f1729" : "#ffffff", fontWeight: "600", fontSize: "14px", cursor: "pointer", backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>
      {icon} {label}
    </button>
  );
}

function StatPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", borderRadius: "100px", padding: "6px 14px", border: "1px solid rgba(255,255,255,0.2)" }}>
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>{label}</span>
    </div>
  );
}
