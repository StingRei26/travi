import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPin } from "lucide-react";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // ── Look up the invite token ──
  const { data: share } = await supabase
    .from("travi_shares")
    .select("id, travi_id, invited_email, accepted_by, accepted_at")
    .eq("token", token)
    .single();

  if (!share) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#0f1729", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "56px", marginBottom: "20px" }}>🔗</div>
          <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: "800", marginBottom: "10px" }}>Invalid Invite</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px", marginBottom: "28px" }}>
            This invite link has expired or been revoked. Ask the owner to send a new one.
          </p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: "12px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>
            Go to Travi
          </Link>
        </div>
      </main>
    );
  }

  // ── Fetch travi + owner profile for preview ──
  const { data: travi } = await supabase
    .from("traviis")
    .select("id, title, emoji, country, description, cover_image_url, cover_gradient, user_id")
    .eq("id", share.travi_id)
    .single();

  const { data: profile } = travi
    ? await supabase.from("profiles").select("name, handle").eq("id", travi.user_id).single()
    : { data: null };

  // ── Check if user is already logged in ──
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Auto-accept if not already accepted
    if (!share.accepted_by) {
      await supabase
        .from("travi_shares")
        .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
        .eq("id", share.id);
    }
    // Redirect straight to the travi
    redirect(`/travi/${share.travi_id}`);
  }

  // ── Not logged in: show travi preview ──
  const heroStyle = travi?.cover_image_url
    ? { backgroundImage: `url(${travi.cover_image_url})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : { background: travi?.cover_gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0f1729", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Hero preview card */}
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Travi preview */}
        <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", marginBottom: "32px" }}>
          {/* Cover */}
          <div style={{ height: "200px", position: "relative", ...heroStyle }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
            <div style={{ position: "absolute", bottom: "20px", left: "20px", right: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <MapPin size={12} color="rgba(255,255,255,0.7)" />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{travi?.country ?? ""}</span>
              </div>
              <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                {travi?.emoji ?? "🌍"} {travi?.title ?? "Shared Travi"}
              </h2>
            </div>
          </div>

          {/* Info */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px 24px" }}>
            {profile && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#0f1729", flexShrink: 0 }}>
                  {(profile.name ?? "T")[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "13px", color: "#1c1917" }}>{profile.name}</p>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>{profile.handle}</p>
                </div>
              </div>
            )}
            {travi?.description && (
              <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.55", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {travi.description}
              </p>
            )}
          </div>
        </div>

        {/* Invite message */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ color: "#ffffff", fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "10px" }}>
            You&apos;ve been invited!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: "1.6" }}>
            {profile?.name ?? "Someone"} shared their Travi with you.
            Sign in or create a free account to view it.
          </p>
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href={`/auth?next=/invite/${token}`}
            style={{ display: "block", textAlign: "center", padding: "15px", borderRadius: "14px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "800", fontSize: "16px", textDecoration: "none" }}
          >
            Accept Invite
          </Link>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            Already have an account?{" "}
            <Link href={`/auth?next=/invite/${token}`} style={{ color: "#c9a84c", textDecoration: "none", fontWeight: "600" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
