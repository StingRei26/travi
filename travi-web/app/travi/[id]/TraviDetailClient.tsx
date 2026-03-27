"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Star, MapPin, Heart, Bookmark, Share2, Calendar,
  MessageCircle, ExternalLink, Globe, Lock, X, Copy, Mail, Check,
  Pencil, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DisplayTravi, DisplayStop } from "./page";

// ─── Types ──────────────────────────────────────────────────────────

type ImageSlot = {
  key: string;
  url: string;
  file?: File;
  existingUrl?: string;
};

type StopEditForm = {
  name: string;
  location: string;
  rating: number;
  review: string;
  images: ImageSlot[];
};

type ShareRecord = {
  id: string;
  invited_email: string;
  token: string;
  accepted_at: string | null;
};

// ─── Constants ──────────────────────────────────────────────────────

const typeColors: Record<string, string> = {
  restaurant: "#f87171",
  hotel: "#60a5fa",
  attraction: "#34d399",
  experience: "#a78bfa",
};

const typeLabels: Record<string, string> = {
  restaurant: "🍽 Restaurant",
  hotel: "🏨 Hotel",
  attraction: "📍 Attraction",
  experience: "✨ Experience",
};

// ─── Props ──────────────────────────────────────────────────────────

interface Props {
  travi: DisplayTravi;
  id: string;
  isOwner: boolean;
  initialIsPublic: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export default function TraviDetailClient({ travi: initialTravi, id, isOwner, initialIsPublic }: Props) {
  // Stop data (can be mutated by inline editing)
  const [stops, setStops] = useState<DisplayStop[]>(initialTravi.stops);

  // Privacy
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  // Share panel
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [sharesLoaded, setSharesLoaded] = useState(false);
  const [latestInvite, setLatestInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline stop edit modal
  const [editingStop, setEditingStop] = useState<DisplayStop | null>(null);
  const [editForm, setEditForm] = useState<StopEditForm | null>(null);
  const [editLocSugs, setEditLocSugs] = useState<string[]>([]);
  const [savingStop, setSavingStop] = useState(false);
  const editImgRef = useRef<HTMLInputElement>(null);
  const editLocDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const travi = { ...initialTravi, stops };

  // ── Helpers ──────────────────────────────────────────────────────

  const addImg = (list: ImageSlot[], file: File): ImageSlot[] => {
    if (list.length >= 3) return list;
    return [...list, { key: `new-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), file }];
  };
  const removeImg = (list: ImageSlot[], key: string) => list.filter((i) => i.key !== key);

  const fetchLocSugs = (q: string) => {
    if (editLocDebRef.current) clearTimeout(editLocDebRef.current);
    if (!q.trim() || q.length < 2) { setEditLocSugs([]); return; }
    editLocDebRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: { display_name: string }[] = await res.json();
        setEditLocSugs(data.map((r) => r.display_name.split(",").slice(0, 3).join(",").trim()));
      } catch { /* ignore */ }
    }, 380);
  };

  // ── Stop edit actions ─────────────────────────────────────────────

  const openEditStop = (stop: DisplayStop) => {
    setEditingStop(stop);
    setEditForm({
      name: stop.name,
      location: stop.location,
      rating: stop.rating,
      review: stop.review,
      images: stop.imageUrls.map((url, i) => ({ key: `existing-${i}`, url, existingUrl: url })),
    });
    setEditLocSugs([]);
  };

  const closeEditStop = () => {
    setEditingStop(null);
    setEditForm(null);
    setEditLocSugs([]);
  };

  const saveStopEdit = async () => {
    if (!editingStop || !editForm) return;
    setSavingStop(true);

    const supabase = createClient();

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
      const { error } = await supabase.storage.from("travi-images").upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("travi-images").getPublicUrl(path);
      return data.publicUrl;
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingStop(false); return; }

    const finalUrls: string[] = [];
    for (const img of editForm.images) {
      if (img.existingUrl) {
        finalUrls.push(img.existingUrl);
      } else if (img.file) {
        const ext = img.file.name.split(".").pop() ?? "jpg";
        const url = await uploadImage(img.file, `${user.id}/${id}/stops/${editingStop.id}-${img.key}.${ext}`);
        if (url) finalUrls.push(url);
      }
    }

    const { error } = await supabase.from("stops").update({
      name: editForm.name,
      location: editForm.location,
      rating: editForm.rating,
      review: editForm.review,
      image_urls: finalUrls,
      image_url: finalUrls[0] ?? null,
    }).eq("id", editingStop.id);

    if (!error) {
      setStops((prev) =>
        prev.map((s) =>
          s.id === editingStop.id
            ? { ...s, name: editForm.name, location: editForm.location, rating: editForm.rating, review: editForm.review, imageUrls: finalUrls }
            : s
        )
      );
    }

    setSavingStop(false);
    closeEditStop();
  };

  // ── Privacy toggle ────────────────────────────────────────────────

  const togglePrivacy = async () => {
    setTogglingPrivacy(true);
    const supabase = createClient();
    const { error } = await supabase.from("traviis").update({ is_public: !isPublic }).eq("id", id);
    if (!error) setIsPublic((v) => !v);
    setTogglingPrivacy(false);
  };

  // ── Share panel ───────────────────────────────────────────────────

  const loadShares = async () => {
    if (sharesLoaded) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("travi_shares")
      .select("id, invited_email, token, accepted_at")
      .eq("travi_id", id)
      .order("created_at", { ascending: false });
    setShares((data as ShareRecord[]) ?? []);
    setSharesLoaded(true);
  };

  const openSharePanel = () => {
    setShareOpen(true);
    loadShares();
  };

  const genToken = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setLatestInvite(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviting(false); return; }

    const token = genToken();
    const { error } = await supabase.from("travi_shares").insert({
      travi_id: id,
      inviter_id: user.id,
      invited_email: inviteEmail.trim().toLowerCase(),
      token,
    });

    if (error) {
      console.error("travi_shares insert error:", error);
      setInviteError(error.message ?? "Failed to create invite. Try again.");
    } else {
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      setLatestInvite({ url: inviteUrl, email: inviteEmail.trim() });
      setShares((prev) => [{ id: token, invited_email: inviteEmail.trim().toLowerCase(), token, accepted_at: null }, ...prev]);
      setInviteEmail("");
    }
    setInviting(false);
  };

  const revokeShare = async (shareId: string) => {
    const supabase = createClient();
    await supabase.from("travi_shares").delete().eq("id", shareId);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Styles ────────────────────────────────────────────────────────

  const heroStyle = travi.coverImageUrl
    ? { backgroundImage: `url(${travi.coverImageUrl})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const, padding: "48px 24px 64px", position: "relative" as const, overflow: "hidden" as const }
    : { background: travi.coverGradient, padding: "48px 24px 64px", position: "relative" as const, overflow: "hidden" as const };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <main style={{ backgroundColor: "#f8f7f4", minHeight: "100vh" }}>
      {/* ── Hero Banner ── */}
      <div style={heroStyle}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "500", textDecoration: "none", marginBottom: "32px" }}>
            <ArrowLeft size={16} />
            Back to Explore
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "52px" }}>{travi.emoji}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={14} color="rgba(255,255,255,0.8)" />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: "500" }}>{travi.country}</span>
                  </div>
                  <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: "800", color: "#ffffff", letterSpacing: "-1.5px", lineHeight: 1.1, marginTop: "4px" }}>
                    {travi.title}
                  </h1>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                  {travi.author.avatar}
                </div>
                <div>
                  <p style={{ color: "#ffffff", fontWeight: "600", fontSize: "14px" }}>{travi.author.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>{travi.author.handle}</p>
                </div>
              </div>

              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "16px", maxWidth: "560px", lineHeight: "1.65" }}>
                {travi.description}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <ActionBtn icon={<Heart size={16} />} label={`${travi.stats.likes} likes`} />
              <ActionBtn icon={<Bookmark size={16} />} label={`${travi.stats.saves} saves`} />
              {isOwner && (
                <button
                  onClick={openSharePanel}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0f1729", fontWeight: "700", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  <Share2 size={16} /> Share
                </button>
              )}
              {!isOwner && <ActionBtn icon={<Share2 size={16} />} label="Share" accent />}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "28px", marginTop: "32px", flexWrap: "wrap" }}>
            {(travi.startDate || travi.endDate) && (
              <StatPill icon="📅" label={`${travi.startDate}${travi.endDate ? ` → ${travi.endDate}` : ""}`} />
            )}
            <StatPill icon="📍" label={`${stops.length} stop${stops.length !== 1 ? "s" : ""}`} />
            {isOwner && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: isPublic ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)", backdropFilter: "blur(8px)", borderRadius: "100px", padding: "6px 14px", border: `1px solid ${isPublic ? "rgba(52,211,153,0.4)" : "rgba(251,191,36,0.4)"}`, cursor: togglingPrivacy ? "not-allowed" : "pointer" }}
                onClick={!togglingPrivacy ? togglePrivacy : undefined}
                title={isPublic ? "Click to make private" : "Click to make public"}
              >
                {isPublic ? <Globe size={13} color="#34d399" /> : <Lock size={13} color="#fbbf24" />}
                <span style={{ color: isPublic ? "#34d399" : "#fbbf24", fontSize: "13px", fontWeight: "600" }}>
                  {isPublic ? "Public" : "Private"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", alignItems: "start" }} className="detail-grid">

          {/* ── Stops timeline ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f1729", letterSpacing: "-0.5px" }}>
                Trip Stops
              </h2>
              {isOwner && (
                <Link
                  href={`/travi/${id}/edit`}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: "1px solid #e7e5e0", backgroundColor: "#ffffff", color: "#0f1729", fontWeight: "600", fontSize: "13px", textDecoration: "none" }}
                >
                  <Pencil size={13} /> Edit Travi
                </Link>
              )}
            </div>

            {stops.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "15px" }}>No stops added yet.</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "23px", top: "0", bottom: "0", width: "2px", background: "linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0.1))", borderRadius: "1px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {stops.map((stop, i) => (
                    <div key={stop.id} style={{ display: "flex", gap: "20px", position: "relative" }}>
                      {/* Pin */}
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#ffffff", border: "3px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, boxShadow: "0 4px 12px rgba(201,168,76,0.3)", zIndex: 1 }}>
                        {stop.emoji}
                      </div>

                      {/* Card */}
                      <div style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                        {stop.imageUrls.length > 0 && (
                          <div style={{ display: "flex", height: "180px", overflow: "hidden" }}>
                            {stop.imageUrls.slice(0, 3).map((url, imgIdx) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={imgIdx} src={url} alt={stop.name}
                                style={{ flex: 1, minWidth: 0, objectFit: "cover", display: "block", borderRight: imgIdx < stop.imageUrls.length - 1 ? "2px solid #f8f7f4" : "none" }}
                              />
                            ))}
                          </div>
                        )}
                        <div style={{ padding: "20px 24px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "100px", backgroundColor: (typeColors[stop.type] ?? "#9ca3af") + "20", color: typeColors[stop.type] ?? "#9ca3af" }}>
                                  {typeLabels[stop.type] ?? stop.type}
                                </span>
                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Stop {i + 1}</span>
                              </div>
                              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f1729" }}>{stop.name}</h3>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
                              <div style={{ display: "flex", gap: "2px" }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={14} fill={s <= stop.rating ? "#c9a84c" : "none"} color={s <= stop.rating ? "#c9a84c" : "#d1d5db"} />
                                ))}
                              </div>
                              {isOwner && (
                                <button
                                  onClick={() => openEditStop(stop)}
                                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "7px", border: "1px solid #e7e5e0", background: "#ffffff", color: "#6b7280", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                            <MapPin size={12} color="#9ca3af" />
                            <span style={{ fontSize: "13px", color: "#9ca3af" }}>{stop.location}</span>
                            {stop.date && (
                              <>
                                <span style={{ color: "#d1d5db", margin: "0 4px" }}>·</span>
                                <Calendar size={12} color="#9ca3af" />
                                <span style={{ fontSize: "13px", color: "#9ca3af" }}>{stop.date}</span>
                              </>
                            )}
                          </div>

                          {stop.review && (
                            <p style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.65", fontStyle: "italic", borderLeft: "3px solid #c9a84c", paddingLeft: "14px" }}>
                              &ldquo;{stop.review}&rdquo;
                            </p>
                          )}

                          {/* Action row */}
                          <div style={{ display: "flex", gap: "16px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f0ede8" }}>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0 }}>
                              <Heart size={14} /> Helpful
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0 }}>
                              <MessageCircle size={14} /> Comment
                            </button>
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", fontWeight: "500", padding: 0, marginLeft: "auto" }}>
                              <ExternalLink size={14} /> Book
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside>
            {/* Tags */}
            {travi.tags.length > 0 && (
              <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", padding: "20px 24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f1729", marginBottom: "14px" }}>Tags</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {travi.tags.map((tag) => (
                    <span key={tag} style={{ padding: "5px 12px", borderRadius: "100px", backgroundColor: "rgba(201,168,76,0.1)", color: "#b8962a", fontSize: "13px", fontWeight: "600" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Owner share panel shortcut */}
            {isOwner && (
              <div style={{ backgroundColor: "#0f1729", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>Share This Travi</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: "16px" }}>
                  {isPublic ? "Anyone with the link can view." : "Private — only invited people can view."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={togglePrivacy}
                    disabled={togglingPrivacy}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${isPublic ? "rgba(52,211,153,0.3)" : "rgba(251,191,36,0.3)"}`, background: "rgba(255,255,255,0.05)", color: isPublic ? "#34d399" : "#fbbf24", fontSize: "13px", fontWeight: "600", cursor: togglingPrivacy ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                  >
                    {isPublic ? <><Globe size={14} /> Public — click to make private</> : <><Lock size={14} /> Private — click to make public</>}
                  </button>
                  <button
                    onClick={openSharePanel}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px", borderRadius: "10px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", border: "none", color: "#0f1729", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <Share2 size={15} /> Manage Sharing
                  </button>
                </div>
              </div>
            )}

            {/* For non-owners: generic share CTA */}
            {!isOwner && (
              <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e7e5e0", padding: "20px 24px", textAlign: "center" }}>
                <Share2 size={28} color="#c9a84c" style={{ marginBottom: "12px" }} />
                <p style={{ fontWeight: "700", color: "#0f1729", fontSize: "15px", marginBottom: "6px" }}>Share this Travi</p>
                <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "16px" }}>Inspire others with this journey</p>
                <button
                  onClick={() => copyToClipboard(window.location.href)}
                  style={{ width: "100%", padding: "11px", borderRadius: "10px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", border: "none", color: "#0f1729", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit" }}
                >
                  {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Stop Edit Modal ── */}
      {editingStop && editForm && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditStop(); }}
        >
          <div style={{ backgroundColor: "#0f1729", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "28px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ color: "#ffffff", fontWeight: "800", fontSize: "18px" }}>Edit Stop</h2>
              <button onClick={closeEditStop} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Name */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f!, name: e.target.value }))} style={fieldStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Location</label>
                <div style={{ position: "relative" }}>
                  <MapPin size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "12px", top: "11px", pointerEvents: "none" }} />
                  <input value={editForm.location}
                    onChange={(e) => { setEditForm((f) => ({ ...f!, location: e.target.value })); fetchLocSugs(e.target.value); }}
                    onBlur={() => setTimeout(() => setEditLocSugs([]), 180)}
                    placeholder="Search location…"
                    style={{ ...fieldStyle, paddingLeft: "34px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
                  />
                  {editLocSugs.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#0b1d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", zIndex: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
                      {editLocSugs.map((s, i) => (
                        <button key={i} onMouseDown={() => { setEditForm((f) => ({ ...f!, location: s })); setEditLocSugs([]); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "none", borderBottom: i < editLocSugs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <MapPin size={12} color="#c9a84c" style={{ flexShrink: 0 }} />
                          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px" }}>{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Rating</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setEditForm((f) => ({ ...f!, rating: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                      <Star size={22} fill={s <= editForm.rating ? "#c9a84c" : "none"} color={s <= editForm.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Review</label>
                <textarea value={editForm.review} onChange={(e) => setEditForm((f) => ({ ...f!, review: e.target.value }))} rows={3}
                  style={{ ...fieldStyle, resize: "none" } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              {/* Images */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Photos <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>({editForm.images.length}/3)</span>
                </label>
                <input ref={editImgRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || editForm.images.length >= 3) return;
                    setEditForm((f) => ({ ...f!, images: addImg(f!.images, file) }));
                    if (editImgRef.current) editImgRef.current.value = "";
                  }}
                />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {editForm.images.map((img) => (
                    <div key={img.key} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => setEditForm((f) => ({ ...f!, images: removeImg(f!.images, img.key) }))}
                        style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >×</button>
                    </div>
                  ))}
                  {editForm.images.length < 3 && (
                    <button onClick={() => editImgRef.current?.click()}
                      style={{ width: "80px", height: "80px", borderRadius: "10px", border: "1.5px dashed rgba(255,255,255,0.15)", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                    >
                      <span style={{ fontSize: "18px" }}>📸</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>Add</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={closeEditStop} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={saveStopEdit} disabled={savingStop || !editForm.name.trim()}
                style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: savingStop ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #c9a84c, #e8c96a)", color: savingStop ? "rgba(255,255,255,0.3)" : "#0f1729", fontWeight: "700", fontSize: "14px", cursor: savingStop ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {savingStop ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Panel Modal ── */}
      {shareOpen && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShareOpen(false); }}
        >
          <div style={{ backgroundColor: "#0f1729", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "28px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ color: "#ffffff", fontWeight: "800", fontSize: "18px" }}>Share & Privacy</h2>
              <button onClick={() => setShareOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>

            {/* Public / Private toggle */}
            <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "16px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "12px" }}>Visibility</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => { if (!isPublic) togglePrivacy(); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "12px", borderRadius: "10px", border: `1.5px solid ${isPublic ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)"}`, background: isPublic ? "rgba(52,211,153,0.1)" : "none", color: isPublic ? "#34d399" : "rgba(255,255,255,0.35)", fontWeight: "700", fontSize: "14px", cursor: isPublic ? "default" : "pointer", fontFamily: "inherit" }}
                >
                  <Globe size={16} /> Public
                </button>
                <button
                  onClick={() => { if (isPublic) togglePrivacy(); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "12px", borderRadius: "10px", border: `1.5px solid ${!isPublic ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`, background: !isPublic ? "rgba(251,191,36,0.1)" : "none", color: !isPublic ? "#fbbf24" : "rgba(255,255,255,0.35)", fontWeight: "700", fontSize: "14px", cursor: !isPublic ? "default" : "pointer", fontFamily: "inherit" }}
                >
                  <Lock size={16} /> Private
                </button>
              </div>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "10px" }}>
                {isPublic ? "Anyone can find and view this Travi." : "Only people you invite can view this Travi."}
              </p>
            </div>

            {/* Copy public link */}
            {isPublic && (
              <div style={{ marginBottom: "24px" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Public Link</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {typeof window !== "undefined" ? window.location.href : `…/travi/${id}`}
                  </div>
                  <button
                    onClick={() => copyToClipboard(typeof window !== "undefined" ? window.location.href : "")}
                    style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: copied ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.1)", color: copied ? "#34d399" : "#ffffff", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                  >
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>
            )}

            {/* Invite by email */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>Invite by Email</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)", color: "#ffffff", fontSize: "14px", fontFamily: "inherit", outline: "none" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}
                  style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: inviteEmail.trim() ? "linear-gradient(135deg, #c9a84c, #e8c96a)" : "rgba(255,255,255,0.08)", color: inviteEmail.trim() ? "#0f1729" : "rgba(255,255,255,0.25)", fontWeight: "700", fontSize: "14px", cursor: inviteEmail.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0 }}
                >
                  {inviting ? "…" : "Invite"}
                </button>
              </div>
              {inviteError && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "6px" }}>{inviteError}</p>}
            </div>

            {/* Latest invite result */}
            {latestInvite && (
              <div style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
                <p style={{ color: "#34d399", fontSize: "13px", fontWeight: "600", marginBottom: "10px" }}>
                  Invite created for {latestInvite.email}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {latestInvite.url}
                  </div>
                  <button onClick={() => copyToClipboard(latestInvite.url)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.1)", color: "#ffffff", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <a
                    href={`mailto:${latestInvite.email}?subject=${encodeURIComponent(`You're invited to view "${travi.title}" on Travi`)}&body=${encodeURIComponent(`Hi!\n\nI'd like to share my Travi with you: "${travi.title}"\n\nClick the link below to view it:\n${latestInvite.url}\n\nSee you there!`)}`}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "rgba(201,168,76,0.2)", color: "#c9a84c", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0, textDecoration: "none" }}
                  >
                    <Mail size={13} /> Email
                  </a>
                </div>
              </div>
            )}

            {/* Existing invites list */}
            {shares.length > 0 && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>
                  Invites ({shares.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {shares.map((share) => (
                    <div key={share.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{share.invited_email}</p>
                        <p style={{ fontSize: "12px", color: share.accepted_at ? "#34d399" : "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                          {share.accepted_at ? "✓ Accepted" : "Pending"}
                        </p>
                      </div>
                      <button onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${share.token}`)}
                        style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                      >
                        <Copy size={12} />
                      </button>
                      <button onClick={() => revokeShare(share.id)}
                        style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid rgba(248,113,113,0.2)", background: "none", color: "rgba(248,113,113,0.6)", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function ActionBtn({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", border: accent ? "none" : "1px solid rgba(255,255,255,0.25)", background: accent ? "linear-gradient(135deg, #c9a84c, #e8c96a)" : "rgba(255,255,255,0.1)", color: accent ? "#0f1729" : "#ffffff", fontWeight: "600", fontSize: "14px", cursor: "pointer", backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>
      {icon} {label}
    </button>
  );
}

function StatPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", borderRadius: "100px", padding: "6px 14px", border: "1px solid rgba(255,255,255,0.2)" }}>
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>{label}</span>
    </div>
  );
}
