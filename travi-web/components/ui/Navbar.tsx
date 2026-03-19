"use client";

import Link from "next/link";
import { useState } from "react";
import { Map, Menu, X, Compass, BookOpen } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #E2E8F0",
      position: "sticky", top: 0, zIndex: 50,
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #FF6B35, #FFB347, #9B5DE5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(155,93,229,0.35)",
          }}>
            <Map size={20} color="#ffffff" />
          </div>
          <span style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", color: "#0F172A" }}>
            travi<span style={{ background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "36px" }} className="hidden-mobile">
          <NavLink href="/explore" icon={<Compass size={15} />} label="Explore" />
          <NavLink href="/my-traviis" icon={<BookOpen size={15} />} label="My Travis" />
          <NavLink href="/plan" icon={<Map size={15} />} label="Plan a Trip" />
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="hidden-mobile">
          <Link href="/explore" style={{ padding: "9px 20px", borderRadius: "100px", border: "1.5px solid #E2E8F0", color: "#0F172A", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
            Sign In
          </Link>
          <Link href="/explore" style={{ padding: "9px 22px", borderRadius: "100px", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", color: "#ffffff", fontSize: "14px", fontWeight: "700", textDecoration: "none", boxShadow: "0 4px 16px rgba(155,93,229,0.35)" }}>
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "#0F172A", padding: "4px" }} className="show-mobile">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ backgroundColor: "#ffffff", borderTop: "1px solid #E2E8F0", padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {[{ href: "/explore", label: "Explore" }, { href: "/my-traviis", label: "My Travis" }, { href: "/plan", label: "Plan a Trip" }].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ color: "#0F172A", fontWeight: "600", fontSize: "16px", textDecoration: "none" }}>
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "20px", display: "flex", gap: "12px" }}>
            <Link href="/explore" style={{ flex: 1, padding: "11px", borderRadius: "100px", border: "1.5px solid #E2E8F0", color: "#0F172A", fontSize: "14px", fontWeight: "600", textDecoration: "none", textAlign: "center" }}>
              Sign In
            </Link>
            <Link href="/explore" style={{ flex: 1, padding: "11px", borderRadius: "100px", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", color: "#ffffff", fontSize: "14px", fontWeight: "700", textDecoration: "none", textAlign: "center" }}>
              Get Started
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile   { display: none !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748B", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#9B5DE5"}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#64748B"}>
      {icon}{label}
    </Link>
  );
}
