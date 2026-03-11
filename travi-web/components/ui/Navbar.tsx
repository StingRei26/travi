"use client";

import Link from "next/link";
import { useState } from "react";
import { Map, Menu, X, Compass, BookOpen, User } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{
        backgroundColor: "#0f1729",
        borderBottom: "1px solid rgba(201,168,76,0.2)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Map size={18} color="#0f1729" />
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
          >
            travi
          </span>
          <span style={{ color: "#c9a84c", fontSize: "22px", fontWeight: "700" }}>.</span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }} className="hidden-mobile">
          <NavLink href="/explore" icon={<Compass size={16} />} label="Explore" />
          <NavLink href="/my-traviis" icon={<BookOpen size={16} />} label="My Traviis" />
          <NavLink href="/plan" icon={<Map size={16} />} label="Plan a Trip" />
        </div>

        {/* CTA + Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="hidden-mobile">
          <Link
            href="/explore"
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
              fontSize: "14px",
              fontWeight: "500",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/explore"
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: "#0f1729",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "4px" }}
          className="show-mobile"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            backgroundColor: "#0f1729",
            borderTop: "1px solid rgba(201,168,76,0.2)",
            padding: "16px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <MobileNavLink href="/explore" label="Explore" onClick={() => setMenuOpen(false)} />
          <MobileNavLink href="/my-traviis" label="My Traviis" onClick={() => setMenuOpen(false)} />
          <MobileNavLink href="/plan" label="Plan a Trip" onClick={() => setMenuOpen(false)} />
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px", display: "flex", gap: "12px" }}>
            <Link
              href="/explore"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid rgba(201,168,76,0.4)",
                color: "#c9a84c",
                fontSize: "14px",
                fontWeight: "500",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/explore"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                color: "#0f1729",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: "rgba(255,255,255,0.7)",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: "500",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "#c9a84c";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        color: "rgba(255,255,255,0.8)",
        textDecoration: "none",
        fontSize: "16px",
        fontWeight: "500",
        padding: "8px 0",
      }}
    >
      {label}
    </Link>
  );
}
