"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Map, Menu, X, Compass, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userInitial, setUserInitial] = useState("?");

  useEffect(() => {
    const supabase = createClient();

    // Get current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      if (user) {
        const name: string =
          (user.user_metadata?.name as string) || user.email || "?";
        setUserInitial(name.charAt(0).toUpperCase());
      }
    });

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const name: string =
            (session.user.user_metadata?.name as string) ||
            session.user.email ||
            "?";
          setUserInitial(name.charAt(0).toUpperCase());
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    setMenuOpen(false);
  };

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
          <span style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff" }}>
            travi<span style={{ color: "#c9a84c" }}>.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }} className="hidden-mobile">
          <NavLink href="/explore" icon={<Compass size={16} />} label="Explore" />
          <NavLink href="/my-traviis" icon={<BookOpen size={16} />} label="My Travis" />
          <NavLink href="/plan" icon={<Map size={16} />} label="New Travi" />
        </div>

        {/* Auth area */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="hidden-mobile">
          {user ? (
            <>
              <Link
                href="/my-traviis"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px 6px 6px",
                  borderRadius: "100px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: "800",
                    color: "#0f1729",
                    flexShrink: 0,
                  }}
                >
                  {userInitial}
                </div>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "500" }}>
                  {(user.user_metadata?.name as string)?.split(" ")[0] || "My Travis"}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
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
                href="/auth"
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
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "4px" }}
          className="show-mobile"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
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
          <MobileNavLink href="/my-traviis" label="My Travis" onClick={() => setMenuOpen(false)} />
          <MobileNavLink href="/plan" label="New Travi" onClick={() => setMenuOpen(false)} />

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
            {user ? (
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Sign Out
              </button>
            ) : (
              <div style={{ display: "flex", gap: "12px" }}>
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
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
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
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
            )}
          </div>
        </div>
      )}

      <style>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile   { display: none  !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none  !important; }
          .show-mobile   { display: block !important; }
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
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#c9a84c")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)")}
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
