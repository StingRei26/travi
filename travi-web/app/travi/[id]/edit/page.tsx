"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Plus, X, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

type StopType = "hotel" | "dining" | "activity" | "experience";

type ImageSlot = {
  key: string;
  url: string;           // blob URL (new) or existing URL
  file?: File;           // only for new uploads
  existingUrl?: string;  // only for images already in DB
};

type EditableStop = {
  id: string;
  isNew: boolean;
  type: StopType;
  name: string;
  location: string;
  rating: number;
  review: string;
  emoji: string;
  images: ImageSlot[];
};

type EditFormData = {
  name: string;
  location: string;
  rating: number;
  review: string;
  images: ImageSlot[];
};

type NewStopData = {
  name: string;
  location: string;
  rating: number;
  review: string;
  images: ImageSlot[];
};

// ─── Constants ──────────────────────────────────────────────────────

const STOP_CONFIG: Record<StopType, { label: string; emoji: string; color: string }> = {
  hotel:      { label: "Hotel",      emoji: "🏨", color: "#60a5fa" },
  dining:     { label: "Dining",     emoji: "🍽️", color: "#f87171" },
  activity:   { label: "Activity",   emoji: "🎯", color: "#34d399" },
  experience: { label: "Experience", emoji: "✨", color: "#a78bfa" },
};

const STOP_TYPE_MAP: Record<StopType, string> = {
  hotel:      "hotel",
  dining:     "restaurant",
  activity:   "attraction",
  experience: "experience",
};

const DB_TO_STOP_TYPE: Record<string, StopType> = {
  hotel:      "hotel",
  restaurant: "dining",
  attraction: "activity",
  experience: "experience",
};

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

// ─── Page ───────────────────────────────────────────────────────────

export default function EditTraviPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Travi fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverGradient, setCoverGradient] = useState(
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  );

  // Stops
  const [stops, setStops] = useState<EditableStop[]>([]);
  const [deletedStopIds, setDeletedStopIds] = useState<string[]>([]);

  // Inline stop edit
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [editLocSugs, setEditLocSugs] = useState<string[]>([]);
  const editStopImgRef = useRef<HTMLInputElement>(null);
  const editLocDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New stop
  const [addingType, setAddingType] = useState<StopType | null>(null);
  const [newStop, setNewStop] = useState<NewStopData>({
    name: "", location: "", rating: 5, review: "", images: [],
  });
  const [newLocSugs, setNewLocSugs] = useState<string[]>([]);
  const newStopImgRef = useRef<HTMLInputElement>(null);
  const newLocDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch travi on mount ──
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: dbTravi } = await supabase
        .from("traviis")
        .select("*, stops(*)")
        .eq("id", id)
        .single();

      if (!dbTravi || dbTravi.user_id !== user.id) {
        router.push(`/travi/${id}`);
        return;
      }

      setTitle(dbTravi.title ?? "");
      setDescription(dbTravi.description ?? "");
      setExistingCoverUrl(dbTravi.cover_image_url ?? null);
      setCoverPreview(dbTravi.cover_image_url ?? null);
      setCoverGradient(
        dbTravi.cover_gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorted = [...(dbTravi.stops ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStops(sorted.map((s: any) => {
        const existingUrls: string[] =
          Array.isArray(s.image_urls) && s.image_urls.length > 0
            ? s.image_urls
            : s.image_url ? [s.image_url] : [];
        return {
          id: s.id,
          isNew: false,
          type: DB_TO_STOP_TYPE[s.type ?? "attraction"] ?? "activity",
          name: s.name,
          location: s.location ?? "",
          rating: s.rating ?? 5,
          review: s.review ?? "",
          emoji: s.emoji ?? "📍",
          images: existingUrls.map((url, i) => ({
            key: `existing-${i}`,
            url,
            existingUrl: url,
          })),
        };
      }));

      setLoading(false);
    };

    load();
  }, [id, router]);

  // ── Location autocomplete helper ──
  const fetchLocSugs = (
    q: string,
    setter: (v: string[]) => void,
    debRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!q.trim() || q.length < 2) { setter([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data: { display_name: string }[] = await res.json();
        setter(data.map((r) => r.display_name.split(",").slice(0, 3).join(",").trim()));
      } catch { /* ignore */ }
    }, 380);
  };

  // ── Image helpers ──
  const addImg = (list: ImageSlot[], file: File): ImageSlot[] => {
    if (list.length >= 3) return list;
    return [...list, { key: `new-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), file }];
  };

  const removeImg = (list: ImageSlot[], key: string): ImageSlot[] =>
    list.filter((img) => img.key !== key);

  // ── Stop actions ──
  const startEditing = (stop: EditableStop) => {
    setEditingStopId(stop.id);
    setEditForm({ name: stop.name, location: stop.location, rating: stop.rating, review: stop.review, images: [...stop.images] });
    setEditLocSugs([]);
  };

  const saveStopEdit = () => {
    if (!editingStopId || !editForm) return;
    setStops((prev) =>
      prev.map((s) =>
        s.id === editingStopId
          ? { ...s, name: editForm.name, location: editForm.location, rating: editForm.rating, review: editForm.review, images: editForm.images }
          : s
      )
    );
    setEditingStopId(null);
    setEditForm(null);
  };

  const removeStop = (stop: EditableStop) => {
    setStops((prev) => prev.filter((s) => s.id !== stop.id));
    if (!stop.isNew) setDeletedStopIds((prev) => [...prev, stop.id]);
    if (editingStopId === stop.id) { setEditingStopId(null); setEditForm(null); }
  };

  const handleAddNewStop = () => {
    if (!newStop.name.trim() || !addingType) return;
    const cfg = STOP_CONFIG[addingType];
    setStops((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        type: addingType,
        name: newStop.name.trim(),
        location: newStop.location.trim(),
        rating: newStop.rating,
        review: newStop.review.trim(),
        emoji: cfg.emoji,
        images: [...newStop.images],
      },
    ]);
    setAddingType(null);
    setNewStop({ name: "", location: "", rating: 5, review: "", images: [] });
    setNewLocSugs([]);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!title.trim()) { setSaveError("Please add a title."); return; }
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
      const { error } = await supabase.storage.from("travi-images").upload(path, file, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from("travi-images").getPublicUrl(path);
      return data.publicUrl;
    };

    // 1. Upload new cover if changed
    let finalCoverUrl = existingCoverUrl;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      finalCoverUrl = await uploadImage(coverFile, `${user.id}/${id}/cover.${ext}`);
    }

    // 2. Update travi row
    const { error: traviErr } = await supabase
      .from("traviis")
      .update({ title: title.trim(), description: description.trim() || null, cover_image_url: finalCoverUrl })
      .eq("id", id);

    if (traviErr) { setSaveError("Failed to save. Please try again."); setSaving(false); return; }

    // 3. Delete removed stops
    if (deletedStopIds.length > 0) {
      await supabase.from("stops").delete().in("id", deletedStopIds);
    }

    // 4. Upsert stops
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const finalUrls: string[] = [];
      for (const img of s.images) {
        if (img.existingUrl) {
          finalUrls.push(img.existingUrl);
        } else if (img.file) {
          const ext = img.file.name.split(".").pop() ?? "jpg";
          const url = await uploadImage(img.file, `${user.id}/${id}/stops/${s.id}-${img.key}.${ext}`);
          if (url) finalUrls.push(url);
        }
      }
      const payload = {
        name: s.name,
        location: s.location,
        rating: s.rating,
        review: s.review,
        order_index: i,
        image_urls: finalUrls,
        image_url: finalUrls[0] ?? null,
      };
      if (s.isNew) {
        await supabase.from("stops").insert({
          ...payload,
          travi_id: id,
          user_id: user.id,
          type: STOP_TYPE_MAP[s.type],
          emoji: s.emoji,
        });
      } else {
        await supabase.from("stops").update(payload).eq("id", s.id);
      }
    }

    router.push(`/travi/${id}`);
  };

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f1729", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✈️</div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>Loading Travi…</p>
        </div>
      </div>
    );
  }

  const coverBg = coverPreview
    ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : { background: coverGradient };

  return (
    <div style={{ background: "#0f1729", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Sticky header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(15,23,41,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: "740px", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", gap: "16px", padding: "0 24px" }}>
          <Link href={`/travi/${id}`} style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "14px", flexShrink: 0 }}>
            <ArrowLeft size={16} /> Back
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px", flex: 1 }}>Edit Travi</p>
          {saveError && <p style={{ color: "#fca5a5", fontSize: "13px", flexShrink: 0 }}>{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 20px", borderRadius: "10px",
              background: saving ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #c9a84c, #e8c96a)",
              border: "none", color: saving ? "rgba(255,255,255,0.3)" : "#0f1729",
              fontWeight: "700", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
            }}
          >
            <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: "740px", margin: "0 auto", padding: "32px 24px 100px" }}>

        {/* Cover photo */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: "10px" }}>
            Cover Photo
          </p>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCoverFile(file);
              setCoverPreview(URL.createObjectURL(file));
            }}
          />
          {coverPreview ? (
            <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", height: "180px", ...coverBg }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
              <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px" }}>
                <button onClick={() => coverInputRef.current?.click()} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "none", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                  Change Photo
                </button>
                <button onClick={() => { setCoverFile(null); setCoverPreview(null); setExistingCoverUrl(null); }} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "none", color: "#fca5a5", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => coverInputRef.current?.click()} style={{ width: "100%", height: "140px", borderRadius: "16px", border: "1.5px dashed rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: "32px" }}>📸</span>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>Add a cover photo</p>
            </button>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.8px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>Trip Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My amazing trip"
            style={{ ...fieldStyle, fontSize: "20px", fontWeight: "700" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "36px" }}>
          <label style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.8px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your trip…" rows={3}
            style={{ ...fieldStyle, resize: "none" } as React.CSSProperties}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* ── Stops ── */}
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: "16px" }}>
          Stops · {stops.length}
        </p>

        {stops.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {stops.map((stop) => {
              const cfg = STOP_CONFIG[stop.type];
              const isEditing = editingStopId === stop.id;

              if (isEditing && editForm) {
                return (
                  <div key={stop.id} style={{ borderRadius: "20px", border: `1px solid ${cfg.color}50`, backgroundColor: "rgba(255,255,255,0.04)", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <span style={{ fontSize: "20px" }}>{cfg.emoji}</span>
                      <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "15px", flex: 1 }}>Edit {cfg.label}</p>
                      <button onClick={() => { setEditingStopId(null); setEditForm(null); }} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                        Cancel
                      </button>
                      <button onClick={saveStopEdit} style={{ padding: "7px 14px", borderRadius: "8px", background: "linear-gradient(135deg, #c9a84c, #e8c96a)", border: "none", color: "#0f1729", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                        Done
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f!, name: e.target.value }))} placeholder="Name" style={fieldStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = `${cfg.color}70`)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                      {/* Location */}
                      <div style={{ position: "relative" }}>
                        <MapPin size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "14px", top: "13px", pointerEvents: "none", zIndex: 1 }} />
                        <input value={editForm.location}
                          onChange={(e) => { setEditForm((f) => ({ ...f!, location: e.target.value })); fetchLocSugs(e.target.value, setEditLocSugs, editLocDebRef); }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; setTimeout(() => setEditLocSugs([]), 180); }}
                          placeholder="Location"
                          style={{ ...fieldStyle, paddingLeft: "36px" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = `${cfg.color}70`)}
                        />
                        {editLocSugs.length > 0 && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#0b1d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", zIndex: 50, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
                            {editLocSugs.map((s, i) => (
                              <button key={i} onMouseDown={() => { setEditForm((f) => ({ ...f!, location: s })); setEditLocSugs([]); }}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", border: "none", borderBottom: i < editLocSugs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
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
                      {/* Rating */}
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Rating</p>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setEditForm((f) => ({ ...f!, rating: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                              <Star size={22} fill={s <= editForm.rating ? "#c9a84c" : "none"} color={s <= editForm.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Review */}
                      <textarea value={editForm.review} onChange={(e) => setEditForm((f) => ({ ...f!, review: e.target.value }))} placeholder="Share your experience…" rows={3}
                        style={{ ...fieldStyle, resize: "none" } as React.CSSProperties}
                        onFocus={(e) => (e.currentTarget.style.borderColor = `${cfg.color}70`)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                      {/* Images */}
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
                          Stop Photos{" "}
                          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>({editForm.images.length}/3)</span>
                        </p>
                        <input ref={editStopImgRef} type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || editForm.images.length >= 3) return;
                            setEditForm((f) => ({ ...f!, images: addImg(f!.images, file) }));
                            if (editStopImgRef.current) editStopImgRef.current.value = "";
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {editForm.images.map((img) => (
                            <div key={img.key} style={{ position: "relative", width: "88px", height: "88px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <button onClick={() => setEditForm((f) => ({ ...f!, images: removeImg(f!.images, img.key) }))}
                                style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                              >×</button>
                            </div>
                          ))}
                          {editForm.images.length < 3 && (
                            <button onClick={() => editStopImgRef.current?.click()}
                              style={{ width: "88px", height: "88px", borderRadius: "10px", border: "1.5px dashed rgba(255,255,255,0.15)", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", cursor: "pointer", flexShrink: 0 }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                            >
                              <span style={{ fontSize: "20px" }}>📸</span>
                              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Default stop card ──
              return (
                <div key={stop.id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  {stop.images.length > 0 && (
                    <div style={{ display: "flex", height: "110px", overflow: "hidden" }}>
                      {stop.images.slice(0, 3).map((img, imgIdx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={img.key} src={img.url} alt=""
                          style={{ flex: 1, minWidth: 0, objectFit: "cover", display: "block", borderRight: imgIdx < stop.images.length - 1 ? "2px solid rgba(15,23,41,0.7)" : "none" }}
                        />
                      ))}
                    </div>
                  )}
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px", flexShrink: 0 }}>{stop.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stop.name}</p>
                      {stop.location && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stop.location}</p>}
                    </div>
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} fill={s <= stop.rating ? "#c9a84c" : "none"} color={s <= stop.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button onClick={() => startEditing(stop)} style={{ padding: "6px 12px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                        Edit
                      </button>
                      <button onClick={() => removeStop(stop)} style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid rgba(248,113,113,0.2)", background: "none", color: "rgba(248,113,113,0.7)", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add stop type picker ── */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: "14px" }}>
            Add a Stop
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {(Object.entries(STOP_CONFIG) as [StopType, typeof STOP_CONFIG[StopType]][]).map(([type, cfg]) => {
              const active = addingType === type;
              return (
                <button key={type} onClick={() => { setAddingType(active ? null : type); setNewLocSugs([]); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", padding: "16px 8px", borderRadius: "16px", border: `1.5px solid ${active ? cfg.color : "rgba(255,255,255,0.1)"}`, backgroundColor: active ? `${cfg.color}16` : "rgba(255,255,255,0.04)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                >
                  <span style={{ fontSize: "24px", lineHeight: 1 }}>{cfg.emoji}</span>
                  <span style={{ color: active ? cfg.color : "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: "700" }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── New stop form ── */}
        {addingType && (
          <div style={{ padding: "20px", borderRadius: "20px", border: `1px solid ${STOP_CONFIG[addingType].color}35`, backgroundColor: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "22px" }}>{STOP_CONFIG[addingType].emoji}</span>
              <h3 style={{ color: "#ffffff", fontWeight: "700", fontSize: "15px" }}>Add {STOP_CONFIG[addingType].label}</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input placeholder={`${STOP_CONFIG[addingType].label} name`} value={newStop.name}
                onChange={(e) => setNewStop((s) => ({ ...s, name: e.target.value }))} style={fieldStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              {/* Location */}
              <div style={{ position: "relative" }}>
                <MapPin size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "14px", top: "13px", pointerEvents: "none", zIndex: 1 }} />
                <input value={newStop.location}
                  onChange={(e) => { setNewStop((s) => ({ ...s, location: e.target.value })); fetchLocSugs(e.target.value, setNewLocSugs, newLocDebRef); }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; setTimeout(() => setNewLocSugs([]), 180); }}
                  placeholder="Location — search an address…"
                  style={{ ...fieldStyle, paddingLeft: "36px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
                />
                {newLocSugs.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#0b1d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", zIndex: 50, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
                    {newLocSugs.map((s, i) => (
                      <button key={i} onMouseDown={() => { setNewStop((n) => ({ ...n, location: s })); setNewLocSugs([]); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", border: "none", borderBottom: i < newLocSugs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
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
              {/* Rating */}
              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Rating</p>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setNewStop((n) => ({ ...n, rating: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                      <Star size={22} fill={s <= newStop.rating ? "#c9a84c" : "none"} color={s <= newStop.rating ? "#c9a84c" : "rgba(255,255,255,0.2)"} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea placeholder="Share your experience…" value={newStop.review}
                onChange={(e) => setNewStop((s) => ({ ...s, review: e.target.value }))} rows={3}
                style={{ ...fieldStyle, resize: "none" } as React.CSSProperties}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${STOP_CONFIG[addingType!].color}70`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              {/* Photos */}
              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
                  Stop Photos{" "}
                  <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>({newStop.images.length}/3)</span>
                </p>
                <input ref={newStopImgRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || newStop.images.length >= 3) return;
                    setNewStop((s) => ({ ...s, images: addImg(s.images, file) }));
                    if (newStopImgRef.current) newStopImgRef.current.value = "";
                  }}
                />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {newStop.images.map((img) => (
                    <div key={img.key} style={{ position: "relative", width: "88px", height: "88px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => setNewStop((s) => ({ ...s, images: removeImg(s.images, img.key) }))}
                        style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >×</button>
                    </div>
                  ))}
                  {newStop.images.length < 3 && (
                    <button onClick={() => newStopImgRef.current?.click()}
                      style={{ width: "88px", height: "88px", borderRadius: "10px", border: "1.5px dashed rgba(255,255,255,0.15)", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", cursor: "pointer", flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                    >
                      <span style={{ fontSize: "20px" }}>📸</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>Add</span>
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  onClick={() => { setAddingType(null); setNewStop({ name: "", location: "", rating: 5, review: "", images: [] }); setNewLocSugs([]); }}
                  style={{ padding: "11px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "transparent", color: "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
                <button onClick={handleAddNewStop} disabled={!newStop.name.trim()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px 20px", borderRadius: "10px", border: "none", background: newStop.name.trim() ? "linear-gradient(135deg, #c9a84c, #e8c96a)" : "rgba(255,255,255,0.08)", color: newStop.name.trim() ? "#0f1729" : "rgba(255,255,255,0.25)", fontWeight: "700", fontSize: "14px", cursor: newStop.name.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                >
                  <Plus size={16} /> Add Stop
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
