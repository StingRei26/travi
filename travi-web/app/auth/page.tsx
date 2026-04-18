"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Map, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already signed in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/my-traviis");
    });
  }, [router]);

  const clearState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() || email.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email — we sent you a confirmation link.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/my-traviis");
      }
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    clearState();
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Don't set loading to false here - the page will redirect
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    clearState();
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#050d1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background gradient blobs */}
      <div style={{ position: "fixed", top: "-120px", right: "-120px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-150px", left: "-100px", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,148,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Back link */}
      <Link
        href="/"
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "rgba(255,255,255,0.45)",
          fontSize: "14px",
          fontWeight: "500",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={15} /> Home
      </Link>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          padding: "40px 36px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Map size={20} color="#0f1729" />
          </div>
          <span style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff" }}>
            travi<span style={{ color: "#c9a84c" }}>.</span>
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "#ffffff",
            letterSpacing: "-0.5px",
            marginBottom: "6px",
          }}
        >
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px", marginBottom: "28px" }}>
          {mode === "signin"
            ? "Sign in to access your Travis"
            : "Start logging your journeys for free"}
        </p>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "28px",
          }}
        >
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "9px",
                border: "none",
                background: mode === m ? "rgba(255,255,255,0.1)" : "none",
                color: mode === m ? "#ffffff" : "rgba(255,255,255,0.45)",
                fontWeight: mode === m ? "700" : "500",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "signup" && (
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rei Ravelo"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                required
                minLength={6}
                style={{ ...inputStyle, paddingRight: "44px" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.35)",
                  padding: 0,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "rgba(248, 113, 113, 0.1)",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                color: "#fca5a5",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#6ee7b7",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: loading
                ? "rgba(255,255,255,0.1)"
                : "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: loading ? "rgba(255,255,255,0.4)" : "#0f1729",
              fontWeight: "700",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
              ? "Sign In →"
              : "Create Account →"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontWeight: "500" }}>or</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "13px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.85)",
            fontWeight: "600",
            fontSize: "15px",
            cursor: googleLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
        >
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Footer note */}
        {mode === "signup" && (
          <p
            style={{
              marginTop: "20px",
              color: "rgba(255,255,255,0.25)",
              fontSize: "12px",
              textAlign: "center",
              lineHeight: "1.5",
            }}
          >
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.45)",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  marginBottom: "7px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontSize: "15px",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};
