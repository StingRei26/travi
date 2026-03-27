"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Map, BookOpen, Globe, LogIn } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis, type Travi } from "@/lib/mockData";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Deterministic gradient pool — picked by travi index
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

// Transform a Supabase DB row into the Travi shape TraviCard expects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToTravi(row: any, profile: { name: string; handle: string }, idx: number): Travi {
  return {
    id: row.id,
    title: row.title ?? "Untitled Travi",
    description: row.description ?? "",
    coverGradient: row.cover_gradient ?? GRADIENTS[idx % GRADIENTS.length],
    emoji: row.emoji ?? "🌍",
    country: row.country ?? "Unknown",
    countryFlag: row.country_flag ?? "🌍",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    isPublic: row.is_public ?? false,
    tags: row.tags ?? [],
    author: {
      name: profile.name,
      avatar: profile.name.charAt(0).toUpperCase(),
      handle: profile.handle,
    },
    stats: { views: 0, likes: 0, saves: 0, comments: 0 },
    stops: (row.stops ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.order_index - b.order_index)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        location: s.location ?? "",
        date: s.date ?? "",
        rating: s.rating ?? 5,
        review: s.review ?? "",
        type: (s.type ?? "attraction") as Travi["stops"][0]["type"],
        emoji: s.emoji ?? "📍",
      })),
  };
}

export default function MyTraviisPage() {
  const [user, setUser] = useState<User | null>(null);
  const [traviis, setTraviis] = useState<Travi[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("Traveler");
  const [profileHandle, setProfileHandle] = useState("@you");

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);

      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, handle")
          .eq("id", user.id)
          .single();

        const name = profile?.name ?? (user.user_metadata?.name as string) ?? "Traveler";
        const handle = profile?.handle ?? "@you";
        setProfileName(name);
        setProfileHandle(handle);

        // Fetch traviis with stops nested
        const { data: rows } = await supabase
          .from("traviis")
          .select("*, stops(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (rows) {
          setTraviis(rows.map((r, i) => dbToTravi(r, { name, handle }, i)));
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  // While loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8f7f4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
          <p style={{ color: "#9ca3af", fontSize: "16px" }}>Loading your Travis…</p>
        </div>
      </div>
    );
  }

  // Not signed in — show preview of mock data + sign-in CTA
  if (!user) {
    const preview = mockTraviis.slice(0, 3);

    return (
      <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
        {/* Hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f1729 0%, #1a2744 100%)",
            padding: "60px 24px 48px",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: "-1px",
                  marginBottom: "10px",
                }}
              >
                My Travis
              </h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "16px" }}>
                Sign in to see your trips and start logging new ones.
              </p>
            </div>
            <Link
              href="/auth"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 24px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                color: "#0f1729",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(201,168,76,0.4)",
              }}
            >
              <LogIn size={18} /> Sign In
            </Link>
          </div>
        </div>

        {/* Preview blurred */}
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "14px",
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            Sample Travis — sign in to see yours
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "28px",
              filter: "blur(3px)",
              pointerEvents: "none",
              userSelect: "none",
              opacity: 0.6,
            }}
          >
            {preview.map((t) => (
              <TraviCard key={t.id} travi={t} />
            ))}
          </div>

          {/* Sign-in overlay CTA */}
          <div
            style={{
              marginTop: "40px",
              padding: "48px 40px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #0f1729, #1a2744)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "48px", display: "block", marginBottom: "20px" }}>✈️</span>
            <h2
              style={{
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "26px",
                letterSpacing: "-0.5px",
                marginBottom: "12px",
              }}
            >
              Your journeys, all in one place
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "16px",
                marginBottom: "32px",
                maxWidth: "420px",
                margin: "0 auto 32px",
                lineHeight: "1.6",
              }}
            >
              Create an account to log trips, save Travi cards, and share your adventures with the world.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/auth"
                style={{
                  padding: "14px 32px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                  color: "#0f1729",
                  fontWeight: "700",
                  fontSize: "16px",
                  textDecoration: "none",
                }}
              >
                Create free account →
              </Link>
              <Link
                href="/explore"
                style={{
                  padding: "14px 32px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: "600",
                  fontSize: "16px",
                  textDecoration: "none",
                }}
              >
                Explore Travis
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Signed-in view
  const totalStops = traviis.reduce((a, t) => a + t.stops.length, 0);
  const countries = new Set(traviis.map((t) => t.country)).size;

  return (
    <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f1729 0%, #1a2744 100%)",
          padding: "60px 24px 48px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#0f1729",
                }}
              >
                {profileName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>Signed in as</p>
                <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>
                  {profileName} · {profileHandle}
                </p>
              </div>
            </div>
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-1px",
              }}
            >
              My Travis
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "16px", marginTop: "6px" }}>
              {traviis.length} {traviis.length === 1 ? "trip" : "trips"} · {totalStops} stops · {countries} {countries === 1 ? "country" : "countries"}
            </p>
          </div>

          <Link
            href="/plan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 24px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: "#0f1729",
              fontWeight: "700",
              fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(201,168,76,0.4)",
            }}
          >
            <Plus size={18} /> New Travi
          </Link>
        </div>

        {/* Quick stats */}
        <div
          style={{
            maxWidth: "1280px",
            margin: "24px auto 0",
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <QuickStat icon={<Map size={18} color="#c9a84c" />} value={traviis.length} label="Travis" />
          <QuickStat icon={<BookOpen size={18} color="#c9a84c" />} value={totalStops} label="Stops logged" />
          <QuickStat icon={<Globe size={18} color="#c9a84c" />} value={countries} label="Countries" />
        </div>
      </div>

      {/* Trips grid */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f1729", marginBottom: "24px" }}>
          Your Trips
        </h2>

        {traviis.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "28px",
            }}
          >
            {traviis.map((travi) => (
              <TraviCard key={travi.id} travi={travi} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Explore CTA */}
        <div
          style={{
            marginTop: "48px",
            padding: "40px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #0f1729, #1a2744)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <p
              style={{
                color: "#c9a84c",
                fontWeight: "600",
                fontSize: "13px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Need inspiration?
            </p>
            <h3
              style={{
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "22px",
                letterSpacing: "-0.5px",
              }}
            >
              Explore what others are doing
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginTop: "6px" }}>
              Browse thousands of real Travis for your next destination
            </p>
          </div>
          <Link
            href="/explore"
            style={{
              padding: "13px 28px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: "#0f1729",
              fontWeight: "700",
              fontSize: "15px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Explore Travis →
          </Link>
        </div>
      </div>
    </main>
  );
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        backgroundColor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
        padding: "12px 20px",
      }}
    >
      {icon}
      <div>
        <p style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", lineHeight: 1 }}>{value}</p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "2px" }}>{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <span style={{ fontSize: "64px" }}>🗺️</span>
      <h3
        style={{
          color: "#0f1729",
          fontWeight: "700",
          fontSize: "20px",
          marginTop: "16px",
          marginBottom: "8px",
        }}
      >
        No Travis yet
      </h3>
      <p style={{ color: "#9ca3af", fontSize: "15px", marginBottom: "28px" }}>
        Start by picking a destination!
      </p>
      <Link
        href="/plan"
        style={{
          padding: "13px 28px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
          color: "#0f1729",
          fontWeight: "700",
          fontSize: "15px",
          textDecoration: "none",
        }}
      >
        Create your first Travi →
      </Link>
    </div>
  );
}
