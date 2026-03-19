"use client";

import Link from "next/link";
import { Plus, Map, BookOpen, Globe } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis } from "@/lib/mockData";

const MY_TRAVIIS = mockTraviis.filter(t => t.author.handle === "@reiravelo");

export default function MyTraviisPage() {
  return (
    <main style={{ backgroundColor: "#F8F7FF", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #FF6B35 0%, #FFB347 35%, #9B5DE5 75%, #0077B6 100%)", padding: "60px 24px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", backdropFilter: "blur(8px)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>R</div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>Signed in as</p>
                <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>Rei Ravelo · @reiravelo</p>
              </div>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "900", color: "#ffffff", letterSpacing: "-1.5px" }}>My Travis</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px", marginTop: "8px" }}>
              {MY_TRAVIIS.length} trips · {MY_TRAVIIS.reduce((acc, t) => acc + t.stops.length, 0)} stops · {new Set(MY_TRAVIIS.map(t => t.country)).size} countries
            </p>
          </div>
          <Link href="/plan" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 24px", borderRadius: "100px", backgroundColor: "#ffffff", color: "#9B5DE5", fontWeight: "700", fontSize: "15px", textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <Plus size={18} /> New Travi
          </Link>
        </div>

        {/* Quick stats */}
        <div style={{ maxWidth: "1280px", margin: "28px auto 0", display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <QuickStat icon={<Map size={16} color="#9B5DE5" />} value={MY_TRAVIIS.length} label="Travis" bg="rgba(255,255,255,0.15)" />
          <QuickStat icon={<BookOpen size={16} color="#FF6B35" />} value={MY_TRAVIIS.reduce((acc, t) => acc + t.stops.length, 0)} label="Stops logged" bg="rgba(255,255,255,0.15)" />
          <QuickStat icon={<Globe size={16} color="#FFB347" />} value={new Set(MY_TRAVIIS.map(t => t.country)).size} label="Countries" bg="rgba(255,255,255,0.15)" />
        </div>
      </div>

      {/* Trips */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0F172A", marginBottom: "24px" }}>Your Trips</h2>

        {MY_TRAVIIS.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {MY_TRAVIIS.map(travi => <TraviCard key={travi.id} travi={travi} />)}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <span style={{ fontSize: "64px" }}>🗺️</span>
            <h3 style={{ color: "#0F172A", fontWeight: "700", fontSize: "20px", marginTop: "16px", marginBottom: "8px" }}>No Travis yet</h3>
            <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px" }}>Start planning your first trip!</p>
            <Link href="/plan" style={{ padding: "13px 28px", borderRadius: "100px", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", color: "#ffffff", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>
              Create your first Travi
            </Link>
          </div>
        )}

        {/* Discover CTA */}
        <div style={{ marginTop: "48px", padding: "40px", borderRadius: "24px", background: "linear-gradient(135deg, #FF6B35 0%, #9B5DE5 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontWeight: "600", fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Need inspiration?</p>
            <h3 style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", letterSpacing: "-0.5px" }}>Explore what others are doing</h3>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", marginTop: "6px" }}>Browse thousands of real Travis for your next destination</p>
          </div>
          <Link href="/explore" style={{ padding: "13px 28px", borderRadius: "100px", backgroundColor: "#ffffff", color: "#9B5DE5", fontWeight: "700", fontSize: "15px", textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
            Explore Travis →
          </Link>
        </div>
      </div>
    </main>
  );
}

function QuickStat({ icon, value, label, bg }: { icon: React.ReactNode; value: number; label: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: bg, backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "16px", padding: "12px 20px" }}>
      {icon}
      <div>
        <p style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", lineHeight: 1 }}>{value}</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", marginTop: "2px" }}>{label}</p>
      </div>
    </div>
  );
}
