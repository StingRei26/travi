"use client";

import Link from "next/link";
import { Plus, Map, BookOpen, Globe } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis } from "@/lib/mockData";

const MY_TRAVIIS = mockTraviis.filter((t) => t.author.handle === "@reiravelo");

export default function MyTraviisPage() {
  return (
    <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f1729 0%, #1a2744 100%)", padding: "60px 24px 48px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: "#0f1729" }}>R</div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>Signed in as</p>
                <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>Rei Ravelo · @reiravelo</p>
              </div>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: "800", color: "#ffffff", letterSpacing: "-1px" }}>My Traviis</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px", marginTop: "8px" }}>
              {MY_TRAVIIS.length} trips · {MY_TRAVIIS.reduce((acc, t) => acc + t.stops.length, 0)} stops · {new Set(MY_TRAVIIS.map((t) => t.country)).size} countries
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
            <Plus size={18} />
            New Travi
          </Link>
        </div>

        {/* Quick stats */}
        <div style={{ maxWidth: "1280px", margin: "24px auto 0", display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <QuickStat icon={<Map size={18} color="#c9a84c" />} value={MY_TRAVIIS.length} label="Traviis" />
          <QuickStat icon={<BookOpen size={18} color="#c9a84c" />} value={MY_TRAVIIS.reduce((acc, t) => acc + t.stops.length, 0)} label="Stops logged" />
          <QuickStat icon={<Globe size={18} color="#c9a84c" />} value={new Set(MY_TRAVIIS.map((t) => t.country)).size} label="Countries" />
        </div>
      </div>

      {/* Trips */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f1729", marginBottom: "24px" }}>Your Trips</h2>

        {MY_TRAVIIS.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "28px" }}>
            {MY_TRAVIIS.map((travi) => (
              <TraviCard key={travi.id} travi={travi} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}

        {/* CTA to explore */}
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
            <p style={{ color: "#c9a84c", fontWeight: "600", fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Need inspiration?</p>
            <h3 style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", letterSpacing: "-0.5px" }}>Explore what others are doing</h3>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", marginTop: "6px" }}>Browse thousands of real Traviis for your next destination</p>
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
            Explore Traviis →
          </Link>
        </div>
      </div>
    </main>
  );
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "12px 20px" }}>
      {icon}
      <div>
        <p style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", lineHeight: 1 }}>{value}</p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: "2px" }}>{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <span style={{ fontSize: "64px" }}>🗺️</span>
      <h3 style={{ color: "#0f1729", fontWeight: "700", fontSize: "20px", marginTop: "16px", marginBottom: "8px" }}>No Traviis yet</h3>
      <p style={{ color: "#9ca3af", fontSize: "15px", marginBottom: "28px" }}>Start planning your first trip!</p>
      <Link href="/plan" style={{ padding: "13px 28px", borderRadius: "12px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>
        Create your first Travi
      </Link>
    </div>
  );
}
