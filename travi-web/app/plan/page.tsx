"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Plus, X, Star, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────

type City = { name: string; country: string; flag: string; lat: number; lon: number };
type StopType = "hotel" | "dining" | "activity" | "experience";
type Stop = {
  id: string;
  type: StopType;
  name: string;
  location: string;
  rating: number;
  review: string;
  emoji: string;
  imageFile?: File;
  imagePreview?: string;
};
type NewStop = {
  name: string;
  location: string;
  rating: number;
  review: string;
  emoji: string;
  imageFile?: File;
  imagePreview?: string;
};

type NominatimResult = {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: { country?: string; country_code?: string; city?: string; town?: string; county?: string };
};

const toFlag = (cc: string) =>
  [...cc.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");

const nominatimToCity = (r: NominatimResult): City => ({
  name: r.address?.city ?? r.address?.town ?? r.address?.county ?? r.name.split(",")[0].trim(),
  country: r.address?.country ?? r.display_name.split(",").at(-1)?.trim() ?? "",
  flag: r.address?.country_code ? toFlag(r.address.country_code) : "🌍",
  lat: parseFloat(r.lat),
  lon: parseFloat(r.lon),
});

// ─── Data ──────────────────────────────────────────────────────────

const CITIES: City[] = [
  { name: "Tokyo",        country: "Japan",        flag: "🇯🇵", lat: 35.7,  lon: 139.7 },
  { name: "Paris",        country: "France",       flag: "🇫🇷", lat: 48.9,  lon: 2.3   },
  { name: "New York",     country: "USA",          flag: "🇺🇸", lat: 40.7,  lon: -74.0 },
  { name: "London",       country: "UK",           flag: "🇬🇧", lat: 51.5,  lon: -0.1  },
  { name: "Sydney",       country: "Australia",    flag: "🇦🇺", lat: -33.9, lon: 151.2 },
  { name: "Dubai",        country: "UAE",          flag: "🇦🇪", lat: 25.2,  lon: 55.3  },
  { name: "Rome",         country: "Italy",        flag: "🇮🇹", lat: 41.9,  lon: 12.5  },
  { name: "Bangkok",      country: "Thailand",     flag: "🇹🇭", lat: 13.8,  lon: 100.5 },
  { name: "Barcelona",    country: "Spain",        flag: "🇪🇸", lat: 41.4,  lon: 2.2   },
  { name: "Bali",         country: "Indonesia",    flag: "🇮🇩", lat: -8.4,  lon: 115.2 },
  { name: "Lisbon",       country: "Portugal",     flag: "🇵🇹", lat: 38.7,  lon: -9.1  },
  { name: "Amsterdam",    country: "Netherlands",  flag: "🇳🇱", lat: 52.4,  lon: 4.9   },
  { name: "Singapore",    country: "Singapore",    flag: "🇸🇬", lat: 1.3,   lon: 103.8 },
  { name: "Santorini",    country: "Greece",       flag: "🇬🇷", lat: 36.4,  lon: 25.4  },
  { name: "Marrakech",    country: "Morocco",      flag: "🇲🇦", lat: 31.6,  lon: -8.0  },
  { name: "Kyoto",        country: "Japan",        flag: "🇯🇵", lat: 35.0,  lon: 135.8 },
  { name: "Cape Town",    country: "South Africa", flag: "🇿🇦", lat: -33.9, lon: 18.4  },
  { name: "Rio de Janeiro", country: "Brazil",     flag: "🇧🇷", lat: -22.9, lon: -43.2 },
  { name: "Maldives",     country: "Maldives",     flag: "🇲🇻", lat: 4.2,   lon: 73.5  },
  { name: "Istanbul",     country: "Turkey",       flag: "🇹🇷", lat: 41.0,  lon: 28.9  },
  { name: "Seoul",        country: "South Korea",  flag: "🇰🇷", lat: 37.6,  lon: 127.0 },
  { name: "Prague",       country: "Czech Republic", flag: "🇨🇿", lat: 50.1, lon: 14.4 },
  { name: "Vienna",       country: "Austria",      flag: "🇦🇹", lat: 48.2,  lon: 16.4  },
  { name: "Chiang Mai",   country: "Thailand",     flag: "🇹🇭", lat: 18.8,  lon: 99.0  },
  { name: "Buenos Aires", country: "Argentina",    flag: "🇦🇷", lat: -34.6, lon: -58.4 },
  { name: "Cancún",       country: "Mexico",       flag: "🇲🇽", lat: 21.2,  lon: -86.8 },
];

const STOP_CONFIG: Record<StopType, { label: string; emoji: string; color: string; desc: string }> = {
  hotel:      { label: "Hotel",      emoji: "🏨", color: "#60a5fa", desc: "Where you stayed"      },
  dining:     { label: "Dining",     emoji: "🍽️", color: "#f87171", desc: "Restaurants & cafés"   },
  activity:   { label: "Activity",   emoji: "🎯", color: "#34d399", desc: "Sights & adventures"   },
  experience: { label: "Experience", emoji: "✨", color: "#a78bfa", desc: "Unique moments"         },
};

// ─── Static star positions (deterministic, no Math.random) ────────

const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: ((i * 7919 + 1009) % 10000) / 100,
  y: ((i * 6271 + 3001) % 10000) / 100,
  r: i % 14 === 0 ? 2.2 : i % 5 === 0 ? 1.5 : 1,
  op: 0.18 + (i % 7) * 0.09,
  dur: 2.5 + (i % 5) * 0.7,
  del: (i % 9) * 0.4,
}));

// ─── Globe helpers ─────────────────────────────────────────────────

function projectCity(
  lat: number, lon: number, angle: number,
  cx: number, cy: number, R: number
): { x: number; y: number; z: number } | null {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + angle) * Math.PI) / 180;
  const x = R * Math.cos(latRad) * Math.sin(lonRad);
  const y = -R * Math.sin(latRad);
  const z = R * Math.cos(latRad) * Math.cos(lonRad);
  if (z < -R * 0.1) return null;
  return { x: cx + x, y: cy + y, z };
}

// ─── Globe Canvas (Three.js) ───────────────────────────────────────

function GlobeCanvas({
  size = 320,
  speedMultiplier = 1,
}: {
  size?: number;
  selectedCity?: City | null;
  speedMultiplier?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any = null;
    let animId: number;
    let mounted = true;

    import("three").then((THREE) => {
      if (!mounted || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.z = 2.6;

      const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      ren.setSize(size, size);
      mountRef.current.appendChild(ren.domElement);
      renderer = ren;

      // Lighting — sunlight from upper-right
      scene.add(new THREE.AmbientLight(0x112244, 2.2));
      const sun = new THREE.DirectionalLight(0xfff4e0, 3.0);
      sun.position.set(5, 3, 4);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x2244aa, 0.5);
      fill.position.set(-4, -1, -3);
      scene.add(fill);

      // Earth sphere
      const earthGeo = new THREE.SphereGeometry(1, 72, 72);
      const earthMat = new THREE.MeshPhongMaterial({
        specular: new THREE.Color(0x224488),
        shininess: 60,
      });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      scene.add(earth);

      const loader = new THREE.TextureLoader();

      // Satellite colour texture
      loader.load("/earth.jpg", (tex) => {
        tex.colorSpace = (THREE as any).SRGBColorSpace ?? "srgb";
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      });

      // Specular map — makes oceans shiny, land dull
      loader.load("/earth-specular.jpg", (tex) => {
        earthMat.specularMap = tex;
        earthMat.needsUpdate = true;
      });

      // Normal map — gives terrain 3-D depth
      loader.load("/earth-normal.jpg", (tex) => {
        earthMat.normalMap = tex;
        earthMat.normalScale = new THREE.Vector2(0.6, 0.6);
        earthMat.needsUpdate = true;
      });

      // Inner atmosphere — visible rim glow from behind
      const atmos1Geo = new THREE.SphereGeometry(1.025, 48, 48);
      const atmos1Mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x3388ff),
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(atmos1Geo, atmos1Mat));

      // Outer soft halo
      const atmos2Geo = new THREE.SphereGeometry(1.12, 48, 48);
      const atmos2Mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x1155cc),
        transparent: true,
        opacity: 0.055,
        side: THREE.BackSide,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(atmos2Geo, atmos2Mat));

      const animate = () => {
        if (!mounted) return;
        animId = requestAnimationFrame(animate);
        earth.rotation.y += 0.0015 * speedRef.current;
        ren.render(scene, camera);
      };
      animate();
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      if (renderer) {
        renderer.dispose();
        if (mountRef.current?.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        filter:
          "drop-shadow(0 0 40px rgba(50,140,255,0.55)) drop-shadow(0 0 90px rgba(30,90,220,0.30))",
      }}
    />
  );
}

// ─── Stars ────────────────────────────────────────────────────────

function Stars() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="white"
            opacity={s.op}
            style={{ animation: `tw ${s.dur}s ease-in-out ${s.del}s infinite alternate` }}
          />
        ))}
      </svg>
      <style>{`@keyframes tw { from { opacity: 0.08; } to { opacity: 0.85; } }`}</style>
    </div>
  );
}

// ─── Step 1 — Globe + Search ───────────────────────────────────────

function GlobeStep({
  query,
  onQueryChange,
  searchResults,
  searchLoading,
  onSelectCity,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  searchResults: City[];
  searchLoading: boolean;
  onSelectCity: (city: City) => void;
}) {
  const popular = CITIES.slice(0, 8);
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "60px 24px 40px",
        gap: "36px",
      }}
    >
      {/* Back */}
      <Link
        href="/my-traviis"
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "rgba(255,255,255,0.55)",
          fontSize: "14px",
          fontWeight: "500",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> My Travis
      </Link>

      {/* Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 14px",
          borderRadius: "100px",
          border: "1px solid rgba(201,168,76,0.45)",
          backgroundColor: "rgba(201,168,76,0.08)",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "#c9a84c",
            fontWeight: "700",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
          }}
        >
          New Travi
        </span>
      </div>

      {/* Headline */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(30px, 5vw, 54px)",
            fontWeight: "800",
            color: "#ffffff",
            letterSpacing: "-1.5px",
            lineHeight: 1.08,
            marginBottom: "10px",
          }}
        >
          Where are you going?
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "16px" }}>
          Pick your destination to start building your Travi
        </p>
      </div>

      {/* Globe */}
      <GlobeCanvas size={320} />

      {/* Search */}
      <div style={{ width: "100%", maxWidth: "480px", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.16)",
            backgroundColor: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(14px)",
          }}
        >
          <Search size={18} color="rgba(255,255,255,0.45)" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search city or country…"
            autoComplete="off"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: "16px",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.38)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {(searchResults.length > 0 || searchLoading) && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "#0b1d35",
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              zIndex: 30,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {searchLoading && searchResults.length === 0 && (
              <div style={{ padding: "16px 20px", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                Searching…
              </div>
            )}
            {searchResults.map((city) => (
              <button
                key={`${city.lat},${city.lon}`}
                onClick={() => onSelectCity(city)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "13px 20px",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{city.flag}</span>
                <div>
                  <p style={{ color: "#ffffff", fontWeight: "600", fontSize: "15px", lineHeight: 1.25 }}>{city.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "2px" }}>{city.country}</p>
                </div>
                <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular chips */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", maxWidth: "540px" }}>
        <p
          style={{
            width: "100%",
            textAlign: "center",
            color: "rgba(255,255,255,0.3)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Popular destinations
        </p>
        {popular.map((city) => (
          <button
            key={city.name}
            onClick={() => onSelectCity(city)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "100px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.14s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.55)";
              e.currentTarget.style.color = "#c9a84c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            {city.flag} {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — Flying animation ─────────────────────────────────────

function FlyingStep({ city }: { city: City }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "40px",
      }}
    >
      {/* Globe + plane */}
      <div
        style={{
          position: "relative",
          width: "380px",
          height: "380px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlobeCanvas size={320} selectedCity={city} speedMultiplier={2.8} />

        {/* Orbit track (visual ellipse — suggests 3D tilt) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "370px",
            height: "100px",
            marginTop: "-50px",
            marginLeft: "-185px",
            borderRadius: "50%",
            border: "1px dashed rgba(201,168,76,0.22)",
            pointerEvents: "none",
          }}
        />

        {/* Plane orbit wrapper — full circle animation */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 0,
            height: 0,
            animation: "planeOrbit 2.3s linear infinite",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "-185px",
              left: "-14px",
              fontSize: "28px",
              display: "block",
              filter: "drop-shadow(0 0 12px rgba(201,168,76,0.95))",
            }}
          >
            ✈️
          </span>
        </div>

        {/* Gold glow ring behind globe */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "340px",
            height: "340px",
            marginTop: "-170px",
            marginLeft: "-170px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)",
            animation: "pulseRing 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          Flying to
        </p>
        <h2
          style={{
            fontSize: "clamp(32px, 6vw, 58px)",
            fontWeight: "800",
            color: "#ffffff",
            letterSpacing: "-1.5px",
            lineHeight: 1.05,
            marginBottom: "10px",
          }}
        >
          {city.flag} {city.name}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "17px" }}>{city.country}</p>
      </div>

      {/* Loading dots */}
      <div style={{ display: "flex", gap: "10px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              backgroundColor: "#c9a84c",
              animation: `bounceDot 1.4s ease-in-out ${i * 0.22}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes planeOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%            { transform: scale(1.1);  opacity: 1; }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%       { transform: scale(1.08); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ─── Cover Image Picker ─────────────────────────────────────────────

function CoverImagePicker({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (file: File, preview: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ marginBottom: "28px" }}>
      <p
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        Cover Photo
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          onChange(file, url);
        }}
      />
      {preview ? (
        <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", height: "180px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Change Photo
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: "100%",
            height: "140px",
            borderRadius: "16px",
            border: "1.5px dashed rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255,255,255,0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)";
            e.currentTarget.style.backgroundColor = "rgba(201,168,76,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
          }}
        >
          <span style={{ fontSize: "32px" }}>📸</span>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>
            Add a cover photo
          </p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>
            Optional — adds a personal touch
          </p>
        </button>
      )}
    </div>
  );
}

// ─── Step 3 — Builder ──────────────────────────────────────────────

function BuilderStep({
  city,
  stops,
  tripTitle,
  onTripTitleChange,
  addingType,
  onSetAddingType,
  newStop,
  onNewStopChange,
  onAddStop,
  onRemoveStop,
  onPublish,
  publishing,
  publishError,
  coverPreview,
  onCoverImageChange,
}: {
  city: City;
  stops: Stop[];
  tripTitle: string;
  onTripTitleChange: (v: string) => void;
  addingType: StopType | null;
  onSetAddingType: (t: StopType | null) => void;
  newStop: NewStop;
  onNewStopChange: (u: Partial<NewStop>) => void;
  onAddStop: () => void;
  onRemoveStop: (id: string) => void;
  onPublish: () => void;
  publishing: boolean;
  publishError: string | null;
  coverPreview: string | null;
  onCoverImageChange: (file: File, preview: string) => void;
}) {
  const [locationSugs, setLocationSugs] = useState<string[]>([]);
  const locDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopImgRef = useRef<HTMLInputElement>(null);

  const handleLocationChange = (q: string) => {
    onNewStopChange({ location: q });
    if (locDebRef.current) clearTimeout(locDebRef.current);
    if (!q.trim() || q.length < 2) { setLocationSugs([]); return; }
    locDebRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: NominatimResult[] = await res.json();
        setLocationSugs(data.map((r) =>
          r.display_name.split(",").slice(0, 3).join(",").trim()
        ));
      } catch { /* ignore */ }
    }, 380);
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        maxWidth: "740px",
        margin: "0 auto",
        padding: "32px 24px 100px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "36px",
          paddingTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "54px",
            height: "54px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(201,168,76,0.22), rgba(201,168,76,0.06))",
            border: "2px solid rgba(201,168,76,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            flexShrink: 0,
          }}
        >
          {city.flag}
        </div>
        <div>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Landed in
          </p>
          <h2 style={{ color: "#ffffff", fontWeight: "800", fontSize: "22px", letterSpacing: "-0.5px" }}>
            {city.name}, {city.country}
          </h2>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <Link
            href="/my-traviis"
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              fontWeight: "600",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            onClick={onPublish}
            disabled={stops.length === 0 || publishing}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              background:
                stops.length > 0 && !publishing
                  ? "linear-gradient(135deg, #c9a84c, #e8c96a)"
                  : "rgba(255,255,255,0.1)",
              border: "none",
              color:
                stops.length > 0 && !publishing ? "#0f1729" : "rgba(255,255,255,0.3)",
              fontWeight: "700",
              fontSize: "14px",
              cursor: stops.length > 0 && !publishing ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {publishing ? "Saving…" : "Publish Travi →"}
          </button>
        </div>
      </div>

      {/* Publish error */}
      {publishError && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            color: "#fca5a5",
            fontSize: "14px",
          }}
        >
          {publishError}
        </div>
      )}

      {/* ── Cover image ── */}
      <CoverImagePicker preview={coverPreview} onChange={onCoverImageChange} />

      {/* ── Trip title ── */}
      <div style={{ marginBottom: "32px" }}>
        <label
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "10px",
          }}
        >
          Trip Title
        </label>
        <input
          value={tripTitle}
          onChange={(e) => onTripTitleChange(e.target.value)}
          placeholder={`My ${city.name} Travi`}
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "#ffffff",
            fontSize: "20px",
            fontWeight: "700",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
        />
      </div>

      {/* ── Card type picker ── */}
      <div style={{ marginBottom: "28px" }}>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          Add a Stop
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {(Object.entries(STOP_CONFIG) as [StopType, (typeof STOP_CONFIG)[StopType]][]).map(([type, cfg]) => {
            const active = addingType === type;
            return (
              <button
                key={type}
                onClick={() => onSetAddingType(active ? null : type)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "7px",
                  padding: "18px 10px",
                  borderRadius: "16px",
                  border: `1.5px solid ${active ? cfg.color : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: active ? `${cfg.color}16` : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "26px", lineHeight: 1 }}>{cfg.emoji}</span>
                <span
                  style={{
                    color: active ? cfg.color : "rgba(255,255,255,0.7)",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {cfg.label}
                </span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", textAlign: "center" }}>
                  {cfg.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Add stop form ── */}
      {addingType && (
        <div
          style={{
            marginBottom: "28px",
            padding: "22px",
            borderRadius: "20px",
            border: `1px solid ${STOP_CONFIG[addingType].color}35`,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "22px" }}>{STOP_CONFIG[addingType].emoji}</span>
            <h3 style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>
              Add {STOP_CONFIG[addingType].label}
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              placeholder={`${STOP_CONFIG[addingType].label} name`}
              value={newStop.name}
              onChange={(e) => onNewStopChange({ name: e.target.value })}
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            {/* Location with autocomplete */}
            <div style={{ position: "relative" }}>
              <MapPin
                size={14}
                color="rgba(255,255,255,0.35)"
                style={{ position: "absolute", left: "14px", top: "13px", pointerEvents: "none", zIndex: 1 }}
              />
              <input
                placeholder={`Location — search an address…`}
                value={newStop.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  setTimeout(() => setLocationSugs([]), 180);
                }}
                style={{ ...fieldStyle, paddingLeft: "36px" }}
              />
              {locationSugs.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0, right: 0,
                  backgroundColor: "#0b1d35",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  zIndex: 50,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                }}>
                  {locationSugs.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => {
                        onNewStopChange({ location: s });
                        setLocationSugs([]);
                      }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "10px",
                        padding: "11px 16px", border: "none",
                        borderBottom: i < locationSugs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        background: "none", cursor: "pointer", textAlign: "left",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <MapPin size={12} color="#c9a84c" style={{ flexShrink: 0 }} />
                      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", lineHeight: 1.35 }}>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rating */}
            <div>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Rating
              </p>
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => onNewStopChange({ rating: s })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                  >
                    <Star
                      size={22}
                      fill={s <= newStop.rating ? "#c9a84c" : "none"}
                      color={s <= newStop.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Share your experience — what made it special?"
              value={newStop.review}
              onChange={(e) => onNewStopChange({ review: e.target.value })}
              rows={3}
              style={{ ...fieldStyle, resize: "none" } as React.CSSProperties}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />

            {/* Stop photo */}
            <div>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Stop Photo
              </p>
              <input
                ref={stopImgRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  onNewStopChange({ imageFile: file, imagePreview: URL.createObjectURL(file) });
                }}
              />
              {newStop.imagePreview ? (
                <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", height: "130px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newStop.imagePreview} alt="Stop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => {
                      onNewStopChange({ imageFile: undefined, imagePreview: undefined });
                      if (stopImgRef.current) stopImgRef.current.value = "";
                    }}
                    style={{
                      position: "absolute", top: "8px", right: "8px",
                      background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "6px",
                      color: "#fff", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                      padding: "4px 8px", fontFamily: "inherit",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => stopImgRef.current?.click()}
                  style={{
                    width: "100%", padding: "11px 16px", borderRadius: "10px",
                    border: "1.5px dashed rgba(255,255,255,0.13)", background: "none",
                    display: "flex", alignItems: "center", gap: "8px",
                    color: "rgba(255,255,255,0.38)", fontSize: "13px", fontWeight: "500",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)")}
                >
                  📸 Add a photo to this stop
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => onSetAddingType(null)}
                style={{
                  padding: "11px 20px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onAddStop}
                disabled={!newStop.name.trim()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "11px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: newStop.name.trim()
                    ? "linear-gradient(135deg, #c9a84c, #e8c96a)"
                    : "rgba(255,255,255,0.08)",
                  color: newStop.name.trim() ? "#0f1729" : "rgba(255,255,255,0.25)",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: newStop.name.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={16} /> Add Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stops list ── */}
      {stops.length > 0 && (
        <div>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            Your Stops · {stops.length}
          </p>

          {/* Timeline line */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "21px",
                top: "24px",
                bottom: "24px",
                width: "2px",
                background: "linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0.08))",
                borderRadius: "1px",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {stops.map((stop, i) => {
                const cfg = STOP_CONFIG[stop.type];
                return (
                  <div key={stop.id} style={{ display: "flex", gap: "16px" }}>
                    {/* Pin */}
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: `${cfg.color}18`,
                        border: `2px solid ${cfg.color}55`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      {stop.emoji}
                    </div>

                    {/* Card */}
                    <div
                      style={{
                        flex: 1,
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {stop.imagePreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={stop.imagePreview}
                          alt={stop.name}
                          style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                        />
                      )}
                      <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "6px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "100px",
                                backgroundColor: `${cfg.color}1a`,
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "12px" }}>Stop {i + 1}</span>
                          </div>
                          <h4 style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px", lineHeight: 1.2 }}>
                            {stop.name}
                          </h4>
                        </div>
                        <button
                          onClick={() => onRemoveStop(stop.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            color: "rgba(255,255,255,0.25)",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {stop.location && (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                          <MapPin size={12} color="rgba(255,255,255,0.35)" />
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>{stop.location}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "2px", marginBottom: stop.review ? "10px" : 0 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={13}
                            fill={s <= stop.rating ? "#c9a84c" : "none"}
                            color={s <= stop.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"}
                          />
                        ))}
                      </div>

                      {stop.review && (
                        <p
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "14px",
                            lineHeight: "1.55",
                            fontStyle: "italic",
                            borderLeft: `3px solid ${cfg.color}50`,
                            paddingLeft: "12px",
                          }}
                        >
                          &ldquo;{stop.review}&rdquo;
                        </p>
                      )}
                      </div>{/* /padding */}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {stops.length === 0 && !addingType && (
        <div
          style={{
            textAlign: "center",
            padding: "52px 24px",
            borderRadius: "20px",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ fontSize: "52px", display: "block", marginBottom: "18px" }}>🗺️</span>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "17px", fontWeight: "600", marginBottom: "8px" }}>
            Start adding stops to your Travi
          </p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
            Hotels, restaurants, activities — build your journey card by card
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared field style ────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
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

// ─── Page ─────────────────────────────────────────────────────────

type Step = "globe" | "flying" | "builder";

// Stop type → DB type mapping
const STOP_TYPE_MAP: Record<StopType, string> = {
  hotel:      "hotel",
  dining:     "restaurant",
  activity:   "attraction",
  experience: "experience",
};

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

export default function PlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("globe");
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [tripTitle, setTripTitle] = useState("");
  const [addingType, setAddingType] = useState<StopType | null>(null);
  const [newStop, setNewStop] = useState<NewStop>({
    name: "", location: "", rating: 5, review: "", emoji: "",
  });
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    queryDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data.map(nominatimToCity));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 380);
  };

  const handleSelectCity = (city: City) => {
    setSelectedCity(city);
    setQuery(city.name + ", " + city.country);
    setStep("flying");
    setTimeout(() => {
      setStep("builder");
      setTripTitle(`My ${city.name} Travi`);
    }, 3600);
  };

  const handleNewStopChange = (update: Partial<NewStop>) =>
    setNewStop((prev) => ({ ...prev, ...update }));

  const handleAddStop = () => {
    if (!newStop.name.trim() || !addingType) return;
    const cfg = STOP_CONFIG[addingType];
    const stop: Stop = {
      id: Date.now().toString(),
      type: addingType,
      name: newStop.name.trim(),
      location: newStop.location.trim() || (selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : ""),
      rating: newStop.rating,
      review: newStop.review.trim(),
      emoji: cfg.emoji,
      imageFile: newStop.imageFile,
      imagePreview: newStop.imagePreview,
    };
    setStops((prev) => [...prev, stop]);
    setAddingType(null);
    setNewStop({ name: "", location: "", rating: 5, review: "", emoji: "", imageFile: undefined, imagePreview: undefined });
  };

  const handlePublish = async () => {
    if (!selectedCity || stops.length === 0) return;
    setPublishing(true);
    setPublishError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    // ── Helper: upload a file to Supabase Storage ──
    const uploadImage = async (file: File, path: string): Promise<string | null> => {
      const { error } = await supabase.storage
        .from("travi-images")
        .upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("travi-images").getPublicUrl(path);
      return data.publicUrl;
    };

    const gradIdx = selectedCity.name.charCodeAt(0) % COVER_GRADIENTS.length;

    // ── 1. Insert travi row ──
    const { data: travi, error: traviErr } = await supabase
      .from("traviis")
      .insert({
        user_id: user.id,
        title: tripTitle || `My ${selectedCity.name} Travi`,
        country: selectedCity.country,
        country_flag: selectedCity.flag,
        emoji: selectedCity.flag,
        cover_gradient: COVER_GRADIENTS[gradIdx],
        is_public: true,
        tags: [selectedCity.country, selectedCity.name],
      })
      .select()
      .single();

    if (traviErr || !travi) {
      setPublishError("Failed to save Travi. Please try again.");
      setPublishing(false);
      return;
    }

    // ── 2. Upload cover image (if provided) ──
    let coverImageUrl: string | null = null;
    if (coverImage) {
      const ext = coverImage.name.split(".").pop() ?? "jpg";
      coverImageUrl = await uploadImage(
        coverImage,
        `${user.id}/${travi.id}/cover.${ext}`
      );
      if (coverImageUrl) {
        await supabase
          .from("traviis")
          .update({ cover_image_url: coverImageUrl })
          .eq("id", travi.id);
      }
    }

    // ── 3. Upload stop images + insert stops ──
    const stopsPayload = await Promise.all(
      stops.map(async (s, i) => {
        let imageUrl: string | null = null;
        if (s.imageFile) {
          const ext = s.imageFile.name.split(".").pop() ?? "jpg";
          imageUrl = await uploadImage(
            s.imageFile,
            `${user.id}/${travi.id}/stops/${i}.${ext}`
          );
        }
        return {
          travi_id: travi.id,
          user_id: user.id,
          name: s.name,
          location: s.location,
          rating: s.rating,
          review: s.review,
          type: STOP_TYPE_MAP[s.type],
          emoji: s.emoji,
          order_index: i,
          image_url: imageUrl,
        };
      })
    );

    const { error: stopsErr } = await supabase.from("stops").insert(stopsPayload);

    if (stopsErr) {
      setPublishError("Travi saved but stops failed. Check My Travis.");
      setPublishing(false);
    } else {
      router.push("/my-traviis");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#050d1a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Stars />

      {step === "globe" && (
        <GlobeStep
          query={query}
          onQueryChange={handleQueryChange}
          searchResults={searchResults}
          searchLoading={searchLoading}
          onSelectCity={handleSelectCity}
        />
      )}

      {step === "flying" && selectedCity && <FlyingStep city={selectedCity} />}

      {step === "builder" && selectedCity && (
        <BuilderStep
          city={selectedCity}
          stops={stops}
          tripTitle={tripTitle}
          onTripTitleChange={setTripTitle}
          addingType={addingType}
          onSetAddingType={setAddingType}
          newStop={newStop}
          onNewStopChange={handleNewStopChange}
          onAddStop={handleAddStop}
          onRemoveStop={(id) => setStops((prev) => prev.filter((s) => s.id !== id))}
          onPublish={handlePublish}
          publishing={publishing}
          publishError={publishError}
          coverPreview={coverPreview}
          onCoverImageChange={(file, preview) => { setCoverImage(file); setCoverPreview(preview); }}
        />
      )}
    </main>
  );
}
