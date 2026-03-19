"use client";

import Link from "next/link";
import { Heart, Bookmark, Eye, MessageCircle, Star, MapPin } from "lucide-react";
import { Travi } from "@/lib/mockData";

export default function TraviCard({ travi }: { travi: Travi }) {
  return (
    <Link href={`/travi/${travi.id}`} style={{ textDecoration: "none", display: "block" }}>
      <article
        style={{ borderRadius: "24px", overflow: "hidden", backgroundColor: "#ffffff", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "pointer" }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-6px)"; el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.13)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)"; }}
      >
        {/* Cover */}
        <div style={{ height: "180px", background: travi.coverGradient, position: "relative", display: "flex", alignItems: "flex-end", padding: "18px" }}>
          <div style={{ position: "absolute", top: "14px", left: "14px", backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: "100px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "5px" }}>
            <MapPin size={11} color="#9B5DE5" />
            <span style={{ color: "#0F172A", fontSize: "12px", fontWeight: "700" }}>{travi.country}</span>
          </div>
          <div style={{ position: "absolute", top: "14px", right: "14px", backgroundColor: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)", borderRadius: "100px", padding: "4px 12px" }}>
            <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "600" }}>{travi.stops.length} stops</span>
          </div>
          <span style={{ fontSize: "48px", lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }}>{travi.emoji}</span>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 22px 22px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "#ffffff", flexShrink: 0 }}>
              {travi.author.avatar}
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", lineHeight: 1 }}>{travi.author.name}</p>
              <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{travi.author.handle}</p>
            </div>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#0F172A", marginBottom: "8px", letterSpacing: "-0.3px" }}>{travi.title}</h3>

          {/* Description */}
          <p style={{ fontSize: "13px", color: "#64748B", lineHeight: "1.55", marginBottom: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {travi.description}
          </p>

          {/* Tags */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
            {travi.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{ padding: "3px 10px", borderRadius: "100px", background: "rgba(155,93,229,0.08)", color: "#9B5DE5", fontSize: "11px", fontWeight: "700" }}>#{tag}</span>
            ))}
          </div>

          {/* Top stop preview */}
          <div style={{ backgroundColor: "#F8F7FF", borderRadius: "12px", padding: "11px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>{travi.stops[0]?.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: "700", color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{travi.stops[0]?.name}</p>
              <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={9} fill={s <= (travi.stops[0]?.rating || 0) ? "#FFB347" : "none"} color={s <= (travi.stops[0]?.rating || 0) ? "#FFB347" : "#CBD5E1"} />)}
              </div>
            </div>
            <span style={{ fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap" }}>+{travi.stops.length - 1} more</span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #F1F5F9" }}>
            <Stat icon={<Eye size={13} />} value={fmt(travi.stats.views)} />
            <Stat icon={<Heart size={13} />} value={fmt(travi.stats.likes)} />
            <Stat icon={<Bookmark size={13} />} value={fmt(travi.stats.saves)} />
            <Stat icon={<MessageCircle size={13} />} value={fmt(travi.stats.comments)} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#94A3B8" }}>
      {icon}
      <span style={{ fontSize: "12px", fontWeight: "600" }}>{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
