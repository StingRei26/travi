"use client";

import Link from "next/link";
import { Heart, Bookmark, Eye, MessageCircle, Star, MapPin } from "lucide-react";
import { Travi } from "@/lib/mockData";

export default function TraviCard({ travi }: { travi: Travi }) {
  return (
    <Link
      href={`/travi/${travi.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <article
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid #e7e5e0",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-6px)";
          el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.14)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 2px 16px rgba(0,0,0,0.06)";
        }}
      >
        {/* Cover */}
        <div
          style={{
            height: "200px",
            background: travi.coverImageUrl ? "transparent" : travi.coverGradient,
            backgroundImage: travi.coverImageUrl ? `url(${travi.coverImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            padding: "20px",
          }}
        >
          {/* Country badge */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              backgroundColor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "100px",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MapPin size={12} color="#ffffff" />
            <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "600" }}>{travi.country}</span>
          </div>

          {/* Stops count badge */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              backgroundColor: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(8px)",
              borderRadius: "100px",
              padding: "4px 12px",
            }}
          >
            <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "600" }}>{travi.stops.length} stops</span>
          </div>

          {/* Big emoji */}
          <span style={{ fontSize: "52px", lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }}>
            {travi.emoji}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "700",
                color: "#0f1729",
                flexShrink: 0,
              }}
            >
              {travi.author.avatar}
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#1c1917", lineHeight: 1 }}>
                {travi.author.name}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1, marginTop: "2px" }}>
                {travi.author.handle}
              </p>
            </div>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f1729", marginBottom: "8px", letterSpacing: "-0.3px" }}>
            {travi.title}
          </h3>

          {/* Description */}
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: "1.55",
              marginBottom: "16px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {travi.description}
          </p>

          {/* Tags */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
            {travi.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "3px 10px",
                  borderRadius: "100px",
                  backgroundColor: "rgba(201,168,76,0.1)",
                  color: "#b8962a",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Quick stop preview */}
          <div
            style={{
              backgroundColor: "#f8f7f4",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{travi.stops[0]?.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#0f1729", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {travi.stops[0]?.name}
              </p>
              <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={10} fill={s <= (travi.stops[0]?.rating || 0) ? "#c9a84c" : "none"} color={s <= (travi.stops[0]?.rating || 0) ? "#c9a84c" : "#d1d5db"} />
                ))}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>+ {travi.stops.length - 1} more</span>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #f0ede8" }}>
            <Stat icon={<Eye size={14} />} value={formatNum(travi.stats.views)} />
            <Stat icon={<Heart size={14} />} value={formatNum(travi.stats.likes)} />
            <Stat icon={<Bookmark size={14} />} value={formatNum(travi.stats.saves)} />
            <Stat icon={<MessageCircle size={14} />} value={formatNum(travi.stats.comments)} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#9ca3af" }}>
      {icon}
      <span style={{ fontSize: "13px", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
