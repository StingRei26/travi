import Link from "next/link";
import { Compass, Map, ChevronRight, Globe, Camera } from "lucide-react";
import TraviCard from "@/components/ui/TraviCard";
import { mockTraviis } from "@/lib/mockData";

export default function HomePage() {
  const featured = mockTraviis.slice(0, 3);

  return (
    <main style={{ backgroundColor: "#ffffff" }}>

      {/* ─── Hero ─── */}
      <section style={{ position: "relative", overflow: "hidden", backgroundColor: "#ffffff", padding: "80px 24px 100px" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-120px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,93,229,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-100px", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,53,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />

        <FloatingPin top="15%" left="6%" label="🇮🇹 Rome" delay="0s" />
        <FloatingPin top="28%" right="5%" label="🇯🇵 Tokyo" delay="0.5s" />
        <FloatingPin bottom="32%" left="4%" label="🇫🇷 Paris" delay="1s" />
        <FloatingPin bottom="18%" right="7%" label="🇬🇷 Santorini" delay="1.5s" />

        <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 18px", borderRadius: "100px", background: "rgba(155,93,229,0.08)", border: "1px solid rgba(155,93,229,0.2)", marginBottom: "32px" }}>
            <Globe size={14} color="#9B5DE5" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#9B5DE5" }}>The social travel platform</span>
          </div>

          <h1 style={{ fontSize: "clamp(44px, 8vw, 92px)", fontWeight: "900", lineHeight: "1.0", letterSpacing: "-3px", color: "#0F172A", marginBottom: "24px" }}>
            Your journey,{" "}
            <span style={{ background: "linear-gradient(135deg, #FF6B35, #FFB347, #9B5DE5, #0077B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              beautifully shared.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "#64748B", maxWidth: "560px", margin: "0 auto 48px", lineHeight: "1.7" }}>
            Plan trips, log every stop, discover the world through real travelers&apos; eyes, and book your next adventure — all in one place.
          </p>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", marginBottom: "56px" }}>
            <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", borderRadius: "100px", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", color: "#ffffff", fontWeight: "700", fontSize: "16px", textDecoration: "none", boxShadow: "0 8px 32px rgba(155,93,229,0.35)" }}>
              <Compass size={18} /> Explore Travis
            </Link>
            <Link href="/my-traviis" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", borderRadius: "100px", border: "2px solid #E2E8F0", color: "#0F172A", fontWeight: "600", fontSize: "16px", textDecoration: "none" }}>
              <Map size={18} /> Plan a Trip
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            <AvatarStack />
            <div style={{ textAlign: "left" }}>
              <p style={{ fontWeight: "700", fontSize: "15px", color: "#0F172A" }}>Join thousands of travelers</p>
              <p style={{ fontSize: "13px", color: "#64748B" }}>Sharing adventures across 90+ countries</p>
            </div>
          </div>
        </div>

        {/* Destination cards strip */}
        <div style={{ maxWidth: "1100px", margin: "72px auto 0", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          {DEST_CARDS.map(d => <DestCard key={d.label} {...d} />)}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{ padding: "100px 24px", backgroundColor: "#F8F7FF" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ color: "#9B5DE5", fontWeight: "700", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Everything you need</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "800", color: "#0F172A", letterSpacing: "-1px" }}>One app for your entire journey</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <FeatureCard icon="🗺️" color="#FF6B35" title="Plan Your Trip" description="Build rich itineraries with locations, dates, and notes. Your whole trip in one beautiful view." />
            <FeatureCard icon="⭐" color="#FFB347" title="Log & Review" description="Check in at spots as you travel. Add photos, reviews, and notes while it's still fresh." />
            <FeatureCard icon="🧭" color="#9B5DE5" title="Discover Travis" description="Browse public Travis from real travelers. Planning Italy? See exactly what others loved." />
            <FeatureCard icon="📅" color="#0077B6" title="Calendar Sync" description="Add your stops directly to your calendar. Stay organized without switching apps." />
            <FeatureCard icon="🏨" color="#FF6B35" title="Book Reservations" description="Reserve hotels, restaurants, and experiences directly through Travi." />
            <FeatureCard icon="📲" color="#9B5DE5" title="Share Your Story" description="Generate stunning share cards for Instagram, TikTok, and more." />
          </div>
        </div>
      </section>

      {/* ─── Popular Travis ─── */}
      <section style={{ padding: "100px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p style={{ color: "#9B5DE5", fontWeight: "700", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Trending now</p>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.5px" }}>Popular Travis</h2>
            </div>
            <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#9B5DE5", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>
              View all <ChevronRight size={18} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {featured.map(travi => <TraviCard key={travi.id} travi={travi} />)}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, #FF6B35 0%, #FFB347 30%, #9B5DE5 70%, #0077B6 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <Camera size={44} color="rgba(255,255,255,0.9)" style={{ marginBottom: "24px" }} />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: "900", color: "#ffffff", letterSpacing: "-1.5px", marginBottom: "20px", lineHeight: "1.1" }}>
            Travel is better when it&apos;s shared.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "18px", lineHeight: "1.7", marginBottom: "48px" }}>
            Join thousands of passionate travelers sharing real stories from around the world.
          </p>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "18px 40px", borderRadius: "100px", backgroundColor: "#ffffff", color: "#9B5DE5", fontWeight: "800", fontSize: "17px", textDecoration: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            Start your Travi <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: "#0F172A", padding: "40px 24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #FF6B35, #9B5DE5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Map size={16} color="#ffffff" />
            </div>
            <span style={{ color: "#ffffff", fontWeight: "800", fontSize: "20px" }}>travi.</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>© 2026 Travi. Your journey, shared.</p>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Privacy", "Terms", "Support"].map(item => (
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

const DEST_CARDS = [
  { label: "🇮🇹 Rome", gradient: "linear-gradient(135deg, #667eea, #764ba2)", sub: "History & Food" },
  { label: "🇯🇵 Tokyo", gradient: "linear-gradient(135deg, #f093fb, #f5576c)", sub: "Culture & Ramen" },
  { label: "🇫🇷 Paris", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)", sub: "Art & Romance" },
  { label: "🇬🇷 Santorini", gradient: "linear-gradient(135deg, #fa709a, #fee140)", sub: "Sun & Views" },
  { label: "🇹🇭 Bangkok", gradient: "linear-gradient(135deg, #43e97b, #38f9d7)", sub: "Temples & Spice" },
];

function FloatingPin({ top, bottom, left, right, label, delay }: { top?: string; bottom?: string; left?: string; right?: string; label: string; delay: string }) {
  return (
    <div className="floating-pin" style={{ position: "absolute", top, bottom, left, right, backgroundColor: "#ffffff", borderRadius: "100px", padding: "7px 14px", fontSize: "13px", color: "#0F172A", fontWeight: "600", whiteSpace: "nowrap", animation: `float 4s ease-in-out ${delay} infinite`, pointerEvents: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.10)", border: "1px solid #E2E8F0" }}>
      {label}
    </div>
  );
}

function DestCard({ label, gradient, sub }: { label: string; gradient: string; sub: string }) {
  return (
    <div style={{ background: gradient, borderRadius: "20px", padding: "28px 20px", minWidth: "150px", flex: "1", textAlign: "center", boxShadow: "0 8px 28px rgba(0,0,0,0.12)" }}>
      <p style={{ fontSize: "28px", marginBottom: "8px" }}>{label.split(" ")[0]}</p>
      <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "15px" }}>{label.split(" ").slice(1).join(" ")}</p>
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "4px" }}>{sub}</p>
    </div>
  );
}

function AvatarStack() {
  const items = [
    { color: "#FF6B35", label: "R" }, { color: "#9B5DE5", label: "A" },
    { color: "#0077B6", label: "S" }, { color: "#FFB347", label: "M" },
    { color: "#43e97b", label: "J" },
  ];
  return (
    <div style={{ display: "flex" }}>
      {items.map((item, i) => (
        <div key={i} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: item.color, border: "2px solid #ffffff", marginLeft: i === 0 ? 0 : "-10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          {item.label}
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, color, title, description }: { icon: string; color: string; title: string; description: string }) {
  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: "20px", padding: "32px", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ width: "52px", height: "52px", borderRadius: "16px", backgroundColor: color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", fontSize: "24px" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A", marginBottom: "10px" }}>{title}</h3>
      <p style={{ color: "#64748B", lineHeight: "1.6", fontSize: "14px" }}>{description}</p>
    </div>
  );
}
