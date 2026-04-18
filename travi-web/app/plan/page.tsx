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
  imageFiles: File[];
  imagePreviews: string[];
  // For imported stops
  sourceUserName?: string;
  sourceTraviTitle?: string;
};
type NewStop = {
  name: string;
  location: string;
  rating: number;
  review: string;
  emoji: string;
  imageFiles: File[];
  imagePreviews: string[];
};
type SavedStop = {
  id: string;
  original_stop_id: string;
  original_travi_id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  type: string;
  emoji: string;
  image_url: string | null;
  image_urls: string[];
  source_user_name: string;
  source_travi_title: string;
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

// ─── Sound helpers (Web Audio API — no external files needed) ──────

function playChime() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch { /* browsers that block AudioContext before user gesture */ }
}

function playWhoosh() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const dur = 0.5;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch { /* silent fail */ }
}

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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
  selectedCity = null,
}: {
  size?: number;
  selectedCity?: City | null;
  speedMultiplier?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const selectedCityRef = useRef(selectedCity);
  selectedCityRef.current = selectedCity;
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);

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
      ren.domElement.style.cursor = "grab";

      // Lighting — balanced and natural
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const sun = new THREE.DirectionalLight(0xffffff, 4.0);
      sun.position.set(5, 3, 4);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xffffff, 1.5);
      fill.position.set(-4, -1, -3);
      scene.add(fill);

      // Earth sphere — natural colors
      const earthGeo = new THREE.SphereGeometry(1, 72, 72);
      const earthMat = new THREE.MeshPhongMaterial({
        specular: new THREE.Color(0x333333),
        shininess: 25,
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

      // Inner atmosphere — lighter sky-blue rim glow
      const atmos1Geo = new THREE.SphereGeometry(1.025, 48, 48);
      const atmos1Mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x99ddff),
        transparent: true,
        opacity: 0.30,
        side: THREE.BackSide,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(atmos1Geo, atmos1Mat));

      // Outer soft halo — brighter and wider
      const atmos2Geo = new THREE.SphereGeometry(1.15, 48, 48);
      const atmos2Mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x77ccff),
        transparent: true,
        opacity: 0.10,
        side: THREE.BackSide,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(atmos2Geo, atmos2Mat));

      // ── Destination pin (gold dot + glow ring) ─────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pinMesh: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pinGlow: any = null;

      const buildPin = (city: City | null) => {
        if (pinMesh) { earth.remove(pinMesh); pinMesh = null; }
        if (pinGlow) { earth.remove(pinGlow); pinGlow = null; }
        if (!city) return;
        const latR = (city.lat * Math.PI) / 180;
        const lonR = (city.lon * Math.PI) / 180;
        const px = Math.cos(latR) * Math.sin(lonR);
        const py = Math.sin(latR);
        const pz = Math.cos(latR) * Math.cos(lonR);
        // Core gold dot
        const pinGeo = new THREE.SphereGeometry(0.038, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c });
        pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(px * 1.022, py * 1.022, pz * 1.022);
        earth.add(pinMesh);
        // Soft glow ring
        const glowGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.25 });
        pinGlow = new THREE.Mesh(glowGeo, glowMat);
        pinGlow.position.copy(pinMesh.position);
        earth.add(pinGlow);
        // Rotate earth so destination faces the viewer
        earth.rotation.y = -lonR;
      };

      buildPin(selectedCityRef.current);

      let frame = 0;
      const animate = () => {
        if (!mounted) return;
        animId = requestAnimationFrame(animate);
        earth.rotation.y += 0.0015 * speedRef.current;
        // Pulse the glow ring
        if (pinGlow) {
          frame++;
          const pulse = 0.18 + 0.18 * Math.sin(frame * 0.06);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pinGlow.material as any).opacity = pulse;
          const s = 1 + 0.35 * Math.sin(frame * 0.06);
          pinGlow.scale.set(s, s, s);
        }
        ren.render(scene, camera);
      };
      animate();

      // ── Interaction: Drag to rotate ──
      const onMouseDown = (e: MouseEvent) => {
        isDraggingRef.current = true;
        lastXRef.current = e.clientX;
        if (ren.domElement) ren.domElement.style.cursor = "grabbing";
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - lastXRef.current;
        earth.rotation.y -= deltaX * 0.01;
        lastXRef.current = e.clientX;
      };
      const onMouseUp = () => {
        isDraggingRef.current = false;
        if (ren.domElement) ren.domElement.style.cursor = "grab";
      };
      const onMouseLeave = () => {
        isDraggingRef.current = false;
        if (ren.domElement) ren.domElement.style.cursor = "grab";
      };

      // ── Wheel zoom ──
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z = Math.max(1.5, Math.min(5.0, camera.position.z + e.deltaY * 0.005));
      };

      // ── Touch support ──
      let touchStartX = 0;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDraggingRef.current = true;
          touchStartX = e.touches[0].clientX;
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && isDraggingRef.current) {
          const deltaX = e.touches[0].clientX - touchStartX;
          earth.rotation.y -= deltaX * 0.01;
          touchStartX = e.touches[0].clientX;
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Pinch zoom logic would go here if we tracked previous distance
        }
      };
      const onTouchEnd = () => {
        isDraggingRef.current = false;
      };

      ren.domElement.addEventListener("mousedown", onMouseDown);
      ren.domElement.addEventListener("mousemove", onMouseMove);
      ren.domElement.addEventListener("mouseup", onMouseUp);
      ren.domElement.addEventListener("mouseleave", onMouseLeave);
      ren.domElement.addEventListener("wheel", onWheel, { passive: false });
      ren.domElement.addEventListener("touchstart", onTouchStart);
      ren.domElement.addEventListener("touchmove", onTouchMove);
      ren.domElement.addEventListener("touchend", onTouchEnd);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      if (renderer) {
        renderer.domElement.removeEventListener("mousedown", (e: any) => {});
        renderer.domElement.removeEventListener("mousemove", (e: any) => {});
        renderer.domElement.removeEventListener("mouseup", (e: any) => {});
        renderer.domElement.removeEventListener("mouseleave", (e: any) => {});
        renderer.domElement.removeEventListener("wheel", (e: any) => {});
        renderer.domElement.removeEventListener("touchstart", (e: any) => {});
        renderer.domElement.removeEventListener("touchmove", (e: any) => {});
        renderer.domElement.removeEventListener("touchend", (e: any) => {});
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
          "drop-shadow(0 0 45px rgba(100,200,255,0.70)) drop-shadow(0 0 100px rgba(80,180,255,0.40))",
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
  const [userLocation, setUserLocation] = useState<{city: string; country: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { "User-Agent": "TraviApp/1.0" } }
            );
            const data = await res.json();
            const city = data.address?.city ?? data.address?.town ?? data.address?.county ?? "Unknown";
            const country = data.address?.country ?? "Unknown";
            setUserLocation({ city, country });
          } catch {
            setUserLocation(null);
          } finally {
            setLocationLoading(false);
          }
        },
        () => {
          setLocationLoading(false);
          setUserLocation(null);
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

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

      {/* Location indicator pill — always visible */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 18px",
        borderRadius: "100px",
        border: "1px solid rgba(100,220,100,0.35)",
        backgroundColor: "rgba(100,220,100,0.09)",
        color: "rgba(200,255,200,0.9)",
        fontSize: "13px",
        fontWeight: "500",
        minWidth: "200px",
        justifyContent: "center",
      }}>
        <div style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: locationLoading ? "#9ca3af" : "#4ade80",
          animation: locationLoading ? "none" : "locationPulse 1.5s ease-in-out infinite",
          flexShrink: 0,
        }} />
        {locationLoading
          ? "📡 Detecting your location…"
          : userLocation
            ? `📍 You're in ${userLocation.city}, ${userLocation.country}`
            : "✈️ Where are you headed?"}
      </div>

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
  // Play a second whoosh + chime burst when this screen mounts
  useEffect(() => {
    const t1 = setTimeout(() => playWhoosh(), 200);
    const t2 = setTimeout(() => playChime(), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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
        @keyframes locationPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
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
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 50, oy: 50 });

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setOffset({
      x: clamp(dragStartRef.current.ox - deltaX / 2, 0, 100),
      y: clamp(dragStartRef.current.oy - deltaY / 2, 0, 100),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.touches[0].clientX - dragStartRef.current.x;
    const deltaY = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: clamp(dragStartRef.current.ox - deltaX / 2, 0, 100),
      y: clamp(dragStartRef.current.oy - deltaY / 2, 0, 100),
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

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
          setOffset({ x: 50, y: 50 });
        }}
      />
      {preview ? (
        <div
          style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            height: "180px",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Cover"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${offset.x}% ${offset.y}%`,
              cursor: isDraggingRef.current ? "grabbing" : "grab",
            }}
          />
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
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center", marginTop: "6px", position: "absolute", bottom: "0", left: "0", right: "0", padding: "4px" }}>
            ✋ Drag to reposition
          </p>
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
  tripMonth,
  onTripMonthChange,
  tripYear,
  onTripYearChange,
  savedStops,
  onImportSavedStop,
  onRemoveSavedStop,
  savedStopsLoading,
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
  tripMonth: string;
  onTripMonthChange: (v: string) => void;
  tripYear: string;
  onTripYearChange: (v: string) => void;
  savedStops: SavedStop[];
  onImportSavedStop: (saved: SavedStop) => void;
  onRemoveSavedStop: (id: string) => void;
  savedStopsLoading: boolean;
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
            {publishing ? "Saving…" : "Save Travi ✈️"}
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

      {/* ── When was this trip? ── */}
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
          When was this trip?
        </label>
        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={tripMonth}
            onChange={(e) => onTripMonthChange(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "#ffffff",
              padding: "12px 16px",
              fontSize: "15px",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
          >
            <option value="">Month</option>
            {MONTHS.map((month, idx) => (
              <option key={idx} value={month}>{month}</option>
            ))}
          </select>
          <select
            value={tripYear}
            onChange={(e) => onTripYearChange(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "#ffffff",
              padding: "12px 16px",
              fontSize: "15px",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
          >
            <option value="">Year</option>
            {Array.from({ length: 27 }, (_, i) => 2026 - i).map((year) => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
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

      {/* ── Saved Stops (from other traviis) ── */}
      {savedStops.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px" }}>📌</span>
            Saved Stops · {savedStops.length}
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              paddingBottom: "8px",
              marginBottom: "4px",
            }}
          >
            {savedStops.map((saved) => (
              <div
                key={saved.id}
                style={{
                  minWidth: "220px",
                  maxWidth: "220px",
                  borderRadius: "14px",
                  border: "1px solid rgba(201,168,76,0.25)",
                  backgroundColor: "rgba(201,168,76,0.06)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {saved.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={saved.image_url}
                    alt={saved.name}
                    style={{ width: "100%", height: "80px", objectFit: "cover" }}
                  />
                )}
                <div style={{ padding: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "4px", lineHeight: 1.3 }}>
                    {saved.name}
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
                    From {saved.source_user_name}&apos;s trip
                  </p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => onImportSavedStop(saved)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                        color: "#0f1729",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      + Add
                    </button>
                    <button
                      onClick={() => onRemoveSavedStop(saved.id)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "none",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            💡 These are stops you saved from other travelers&apos; trips
          </p>
        </div>
      )}

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

            {/* Stop photos — up to 3 */}
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
                Stop Photos{" "}
                <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>
                  ({newStop.imagePreviews.length}/3)
                </span>
              </p>
              <input
                ref={stopImgRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || newStop.imagePreviews.length >= 3) return;
                  onNewStopChange({
                    imageFiles: [...newStop.imageFiles, file],
                    imagePreviews: [...newStop.imagePreviews, URL.createObjectURL(file)],
                  });
                  if (stopImgRef.current) stopImgRef.current.value = "";
                }}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {newStop.imagePreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    style={{ position: "relative", width: "88px", height: "88px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => {
                        onNewStopChange({
                          imageFiles: newStop.imageFiles.filter((_, i) => i !== idx),
                          imagePreviews: newStop.imagePreviews.filter((_, i) => i !== idx),
                        });
                      }}
                      style={{
                        position: "absolute", top: "4px", right: "4px",
                        width: "22px", height: "22px", borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", fontSize: "14px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newStop.imagePreviews.length < 3 && (
                  <button
                    onClick={() => stopImgRef.current?.click()}
                    style={{
                      width: "88px", height: "88px", borderRadius: "10px",
                      border: "1.5px dashed rgba(255,255,255,0.15)", background: "none",
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", gap: "5px", cursor: "pointer", flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                  >
                    <span style={{ fontSize: "22px" }}>📸</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>Add</span>
                  </button>
                )}
              </div>
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
                      {stop.imagePreviews.length > 0 && (
                        <div style={{ display: "flex", height: "110px", overflow: "hidden" }}>
                          {stop.imagePreviews.map((preview, imgIdx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={imgIdx}
                              src={preview}
                              alt={stop.name}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                objectFit: "cover",
                                display: "block",
                                borderRight: imgIdx < stop.imagePreviews.length - 1 ? "2px solid rgba(15,23,41,0.8)" : "none",
                              }}
                            />
                          ))}
                        </div>
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
                          {stop.sourceUserName && (
                            <p style={{ fontSize: "11px", color: "rgba(201,168,76,0.7)", marginTop: "4px" }}>
                              📌 From {stop.sourceUserName}&apos;s trip
                            </p>
                          )}
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
  const [tripMonth, setTripMonth] = useState("");
  const [tripYear, setTripYear] = useState("");
  const [addingType, setAddingType] = useState<StopType | null>(null);
  const [newStop, setNewStop] = useState<NewStop>({
    name: "", location: "", rating: 5, review: "", emoji: "", imageFiles: [], imagePreviews: [],
  });
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved stops from other traviis
  const [savedStops, setSavedStops] = useState<SavedStop[]>([]);
  const [savedStopsLoading, setSavedStopsLoading] = useState(false);
  const savedStopsLoaded = useRef(false);

  // Load saved stops when entering builder step
  useEffect(() => {
    if (step === "builder" && !savedStopsLoaded.current) {
      savedStopsLoaded.current = true;
      loadSavedStops();
    }
  }, [step]);

  const loadSavedStops = async () => {
    setSavedStopsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavedStopsLoading(false); return; }

    const { data } = await supabase
      .from("saved_stops")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSavedStops((data as SavedStop[]) ?? []);
    setSavedStopsLoading(false);
  };

  const handleImportSavedStop = (saved: SavedStop) => {
    // Map saved stop type to our StopType
    const typeMap: Record<string, StopType> = {
      hotel: "hotel",
      restaurant: "dining",
      attraction: "activity",
      experience: "experience",
    };
    const stopType = typeMap[saved.type] ?? "activity";
    const cfg = STOP_CONFIG[stopType];

    const stop: Stop = {
      id: `imported-${Date.now()}-${saved.id}`,
      type: stopType,
      name: saved.name,
      location: saved.location ?? "",
      rating: saved.rating ?? 5,
      review: saved.review ?? "",
      emoji: saved.emoji ?? cfg.emoji,
      imageFiles: [],
      imagePreviews: saved.image_urls ?? (saved.image_url ? [saved.image_url] : []),
      sourceUserName: saved.source_user_name,
      sourceTraviTitle: saved.source_travi_title,
    };

    setStops((prev) => [...prev, stop]);
  };

  const handleRemoveSavedStop = async (savedStopId: string) => {
    const supabase = createClient();
    await supabase.from("saved_stops").delete().eq("id", savedStopId);
    setSavedStops((prev) => prev.filter((s) => s.id !== savedStopId));
  };

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
    playWhoosh();
    setTimeout(playChime, 600); // chime hits after the whoosh settles
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
      imageFiles: [...newStop.imageFiles],
      imagePreviews: [...newStop.imagePreviews],
    };
    setStops((prev) => [...prev, stop]);
    setAddingType(null);
    setNewStop({ name: "", location: "", rating: 5, review: "", emoji: "", imageFiles: [], imagePreviews: [] });
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
        start_date: tripYear && tripMonth ? `${tripYear}-${String(MONTHS.indexOf(tripMonth)+1).padStart(2,"0")}-01` : null,
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
        const imageUrls: string[] = [];
        for (let j = 0; j < s.imageFiles.length; j++) {
          const file = s.imageFiles[j];
          const ext = file.name.split(".").pop() ?? "jpg";
          const url = await uploadImage(
            file,
            `${user.id}/${travi.id}/stops/${i}-${j}.${ext}`
          );
          if (url) imageUrls.push(url);
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
          image_urls: imageUrls,
          image_url: imageUrls[0] ?? null,
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
          tripMonth={tripMonth}
          onTripMonthChange={setTripMonth}
          tripYear={tripYear}
          onTripYearChange={setTripYear}
          savedStops={savedStops}
          onImportSavedStop={handleImportSavedStop}
          onRemoveSavedStop={handleRemoveSavedStop}
          savedStopsLoading={savedStopsLoading}
        />
      )}
    </main>
  );
}
