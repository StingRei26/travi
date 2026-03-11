import Link from "next/link";
import { Compass, Star, Calendar, Share2, Map, BookOpen, Users, ChevronRight, Globe } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis } from "@/lib/mockData";

export default function HomePage() {
  const featured = mockTraviis.slice(0, 3);

  return (
    <main>
      {/* ─── Hero ─── */}
      <section
        style={{
          position: "relative",
          minHeight: "92vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0f1729 0%, #1a2744 50%, #0d2138 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-150px", left: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Floating pins */}
        <FloatingPin top="20%" left="10%" label="🇮🇹 Rome" delay="0s" />
        <FloatingPin top="35%" right="8%" label="🇯🇵 Tokyo" delay="0.5s" />
        <FloatingPin top="62%" left="5%" label="🇫🇷 Paris" delay="1s" />
        <FloatingPin bottom="22%" right="12%" label="🇧🇷 Rio" delay="1.5s" />

        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 24px", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", border: "1px solid rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: "32px" }}>
            <Globe size={14} color="#c9a84c" />
            <span style={{ color: "#c9a84c", fontSize: "13px", fontWeight: "500" }}>The social travel platform</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(40px, 7vw, 88px)", fontWeight: "800", color: "#ffffff", lineHeight: "1.05", letterSpacing: "-2px", marginBottom: "24px", maxWidth: "800px" }}>
            Every journey
            <br />
            <span style={{ background: "linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              deserves a story.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.65)", maxWidth: "540px", lineHeight: "1.7", marginBottom: "48px" }}>
            Plan trips, log your experiences in real time, discover the world through other
            travelers&apos; eyes, and book your next adventure — all in one place.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", borderRadius: "12px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "700", fontSize: "16px", textDecoration: "none", boxShadow: "0 8px 32px rgba(201,168,76,0.35)" }}>
              <Compass size={18} />
              Explore Traviis
            </Link>
            <Link href="/my-traviis" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "600", fontSize: "16px", textDecoration: "none", backgroundColor: "rgba(255,255,255,0.05)" }}>
              <Map size={18} />
              Plan a Trip
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: "64px", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            <AvatarStack />
            <div>
              <p style={{ color: "#ffffff", fontWeight: "600", fontSize: "15px" }}>Join thousands of travelers</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>Sharing adventures across 90+ countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{ padding: "100px 24px", backgroundColor: "#f8f7f4" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p style={{ color: "#c9a84c", fontWeight: "600", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Everything you need</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "800", color: "#0f1729", letterSpacing: "-1px", lineHeight: "1.15" }}>
              One app for your entire journey
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <FeatureCard icon={<Map size={24} color="#c9a84c" />} title="Plan Your Trip" description="Build detailed itineraries with locations, dates, notes, and more. Your entire trip in one beautiful view." />
            <FeatureCard icon={<Star size={24} color="#c9a84c" />} title="Log & Review" description="Check in at locations as you travel. Add reviews, photos, and personal notes while the memory is fresh." />
            <FeatureCard icon={<Compass size={24} color="#c9a84c" />} title="Discover Traviis" description="Explore public Traviis from travelers worldwide. Planning a trip to Italy? See exactly what others loved." />
            <FeatureCard icon={<BookOpen size={24} color="#c9a84c" />} title="Book Reservations" description="Reserve restaurants, hotels, and experiences directly through Travi. No switching between apps." />
            <FeatureCard icon={<Calendar size={24} color="#c9a84c" />} title="Calendar Sync" description="Add your trip stops directly to your calendar. Stay organized without ever leaving the app." />
            <FeatureCard icon={<Share2 size={24} color="#c9a84c" />} title="Share Your Story" description="Generate beautiful share cards for Instagram, X, and more. Your adventure, perfectly framed." />
          </div>
        </div>
      </section>

      {/* ─── Featured Traviis ─── */}
      <section style={{ padding: "100px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p style={{ color: "#c9a84c", fontWeight: "600", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Trending now</p>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: "800", color: "#0f1729", letterSpacing: "-0.5px" }}>Popular Traviis</h2>
            </div>
            <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#c9a84c", fontWeight: "600", fontSize: "15px", textDecoration: "none" }}>
              View all <ChevronRight size={18} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
            {featured.map((travi) => (
              <TraviCard key={travi.id} travi={travi} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, #0f1729 0%, #1a2744 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <Users size={40} color="#c9a84c" style={{ marginBottom: "24px" }} />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "800", color: "#ffffff", letterSpacing: "-1px", marginBottom: "20px", lineHeight: "1.15" }}>
            Travel is better<br />
            <span style={{ color: "#c9a84c" }}>when it&apos;s shared.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "18px", lineHeight: "1.7", marginBottom: "48px" }}>
            Join a community of passionate travelers sharing real experiences from around the world.
          </p>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "18px 40px", borderRadius: "12px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "700", fontSize: "17px", textDecoration: "none", boxShadow: "0 8px 32px rgba(201,168,76,0.35)" }}>
            Start your Travi <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: "#0a0f1e", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Map size={16} color="#0f1729" />
            </div>
            <span style={{ color: "#ffffff", fontWeight: "700", fontSize: "18px" }}>travi.</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>© 2026 Travi. Your journey, shared.</p>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Privacy", "Terms", "Support"].map((item) => (
              <Link key={item} href="#" style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none" }}>{item}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}

// ─── Sub-components ───

function FloatingPin({ top, bottom, left, right, label, delay }: {
  top?: string; bottom?: string; left?: string; right?: string; label: string; delay: string;
}) {
  return (
    <div className="floating-pin" style={{ position: "absolute", top, bottom, left, right, backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "100px", padding: "6px 14px", fontSize: "13px", color: "#ffffff", fontWeight: "500", whiteSpace: "nowrap", animation: `float 4s ease-in-out ${delay} infinite`, pointerEvents: "none" }}>
      {label}
    </div>
  );
}

function AvatarStack() {
  const items = [
    { color: "#e8c96a", label: "R" },
    { color: "#63b3ed", label: "A" },
    { color: "#f687b3", label: "S" },
    { color: "#68d391", label: "M" },
    { color: "#f6ad55", label: "J" },
  ];
  return (
    <div style={{ display: "flex" }}>
      {items.map((item, i) => (
        <div key={i} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: item.color, border: "2px solid #0f1729", marginLeft: i === 0 ? 0 : "-10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#0f1729" }}>
          {item.label}
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "32px", border: "1px solid #e7e5e0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f1729", marginBottom: "10px" }}>{title}</h3>
      <p style={{ color: "#6b7280", lineHeight: "1.6", fontSize: "15px" }}>{description}</p>
    </div>
  );
}
