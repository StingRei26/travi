"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Compass } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import type { Travi } from "@/lib/mockData";

interface Props {
  traviis: Travi[];
}

export default function ExploreClient({ traviis }: Props) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");

  // Build dynamic tag list from real data (countries + common tags, deduped)
  const tags = useMemo(() => {
    const set = new Set<string>();
    traviis.forEach((t) => {
      set.add(t.country);
      t.tags.forEach((tag) => set.add(tag));
    });
    // Keep it to 12 tags max so the bar doesn't overflow terribly
    const sorted = Array.from(set).sort();
    return ["All", ...sorted.slice(0, 12)];
  }, [traviis]);

  const filtered = useMemo(() => {
    return traviis.filter((t) => {
      const matchQuery =
        query === "" ||
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.country.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchTag =
        activeTag === "All" ||
        t.country === activeTag ||
        t.tags.includes(activeTag);
      return matchQuery && matchTag;
    });
  }, [traviis, query, activeTag]);

  return (
    <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f1729 0%, #1a2744 100%)",
          padding: "60px 24px 48px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Compass size={28} color="#c9a84c" />
            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-1px",
              }}
            >
              Explore Travis
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "17px", marginBottom: "32px" }}>
            Discover real trip journals from travelers around the world
          </p>

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: "560px" }}>
            <Search
              size={18}
              color="#9ca3af"
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search destinations, countries, or experiences..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                backdropFilter: "blur(8px)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e7e5e0",
          padding: "16px 24px",
          position: "sticky",
          top: "64px",
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "4px",
            alignItems: "center",
          }}
        >
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: "7px 16px",
                borderRadius: "100px",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: activeTag === tag ? "#0f1729" : "#f0ede8",
                color: activeTag === tag ? "#c9a84c" : "#6b7280",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {tag}
            </button>
          ))}
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "100px",
              border: "1px solid #e7e5e0",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontWeight: "600",
              backgroundColor: "#ffffff",
              color: "#6b7280",
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        {traviis.length === 0 ? (
          /* Empty state when no traviis exist at all */
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <span style={{ fontSize: "64px", display: "block", marginBottom: "20px" }}>✈️</span>
            <h2 style={{ color: "#1f2937", fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>
              No Travis yet
            </h2>
            <p style={{ color: "#6b7280", fontSize: "16px", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
              Be the first to share your travel journey! Create a Travi and inspire other travelers.
            </p>
            <a
              href="/plan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                color: "#0f1729",
                fontWeight: "700",
                fontSize: "15px",
                textDecoration: "none",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              Create Your First Travi
            </a>
          </div>
        ) : (
          <>
            <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "28px" }}>
              {filtered.length} {filtered.length === 1 ? "Travi" : "Travis"} found
              {activeTag !== "All" ? ` in ${activeTag}` : ""}
              {query ? ` matching "${query}"` : ""}
            </p>

            {filtered.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "28px",
                }}
              >
                {filtered.map((travi) => (
                  <TraviCard key={travi.id} travi={travi} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <span style={{ fontSize: "48px" }}>🗺️</span>
                <p style={{ color: "#6b7280", fontSize: "18px", marginTop: "16px", fontWeight: "500" }}>
                  No Travis found
                </p>
                <p style={{ color: "#9ca3af", fontSize: "14px", marginTop: "8px" }}>
                  Try a different search or filter
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
