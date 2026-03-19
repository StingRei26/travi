"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, Compass } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis } from "@/lib/mockData";

const TAGS = ["All", "Italy", "Japan", "France", "Greece", "Thailand", "Portugal", "Food", "Adventure", "Romance"];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");

  const filtered = mockTraviis.filter(t => {
    const matchQuery = query === "" || t.title.toLowerCase().includes(query.toLowerCase()) || t.country.toLowerCase().includes(query.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    const matchTag = activeTag === "All" || t.tags.includes(activeTag);
    return matchQuery && matchTag;
  });

  return (
    <main style={{ backgroundColor: "#F8F7FF", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #FF6B35 0%, #FFB347 35%, #9B5DE5 75%, #0077B6 100%)", padding: "60px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Compass size={24} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "900", color: "#ffffff", letterSpacing: "-1.5px" }}>
              Explore Travis
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "17px", marginBottom: "32px" }}>
            Discover real trip journals from travelers around the world
          </p>
          {/* Search */}
          <div style={{ position: "relative", maxWidth: "560px" }}>
            <Search size={18} color="rgba(255,255,255,0.6)" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search destinations, countries, or experiences..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: "100%", padding: "15px 16px 15px 46px", borderRadius: "100px", border: "none", backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#ffffff", fontSize: "15px", outline: "none" }}
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", position: "sticky", top: "68px", zIndex: 40, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px", alignItems: "center" }}>
          {TAGS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)} style={{ padding: "7px 18px", borderRadius: "100px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "13px", fontWeight: "700", backgroundColor: activeTag === tag ? "#9B5DE5" : "#F1F5F9", color: activeTag === tag ? "#ffffff" : "#64748B", transition: "all 0.15s", flexShrink: 0 }}>
              {tag}
            </button>
          ))}
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "100px", border: "1.5px solid #E2E8F0", cursor: "pointer", whiteSpace: "nowrap", fontSize: "13px", fontWeight: "600", backgroundColor: "#ffffff", color: "#64748B", marginLeft: "auto", flexShrink: 0 }}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ color: "#94A3B8", fontSize: "14px", fontWeight: "500", marginBottom: "28px" }}>
          {filtered.length} {filtered.length === 1 ? "Travi" : "Travis"} found
          {activeTag !== "All" ? ` in ${activeTag}` : ""}
          {query ? ` matching "${query}"` : ""}
        </p>

        {filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {filtered.map(travi => <TraviCard key={travi.id} travi={travi} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <span style={{ fontSize: "52px" }}>🗺️</span>
            <p style={{ color: "#0F172A", fontSize: "18px", marginTop: "16px", fontWeight: "700" }}>No Travis found</p>
            <p style={{ color: "#94A3B8", fontSize: "14px", marginTop: "8px" }}>Try a different search or filter</p>
          </div>
        )}
      </div>
    </main>
  );
}
