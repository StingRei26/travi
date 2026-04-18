"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Users,
  Copy,
  Check,
  Trash2,
  GripVertical,
  MapPin,
  Utensils,
  Camera,
  Bed,
  ShoppingBag,
  Star,
  Search,
  X,
  Bookmark,
  UserPlus,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TripPlan = {
  id: string;
  owner_id: string;
  title: string;
  destination: string | null;
  country: string | null;
  country_flag: string | null;
  planned_date: string | null;
  description: string | null;
  cover_gradient: string;
  is_active: boolean;
  created_at: string;
};

type TripStop = {
  id: string;
  trip_plan_id: string;
  added_by: string;
  name: string;
  location: string | null;
  type: string;
  notes: string | null;
  source_stop_id: string | null;
  source_user_name: string | null;
  order_index: number;
  created_at: string;
  added_by_name?: string;
  planned_date?: string | null;
};

type Collaborator = {
  id: string;
  trip_plan_id: string;
  user_id: string | null;
  invited_email: string | null;
  invite_token: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
  user_name?: string;
};

type SavedStop = {
  id: string;
  stop_id: string;
  name: string;
  location: string;
  type: string;
  travi_title: string;
  user_name: string;
};

type TraviStop = {
  id: string;
  name: string;
  location: string;
  type: string;
  travi_id: string;
  travi_title: string;
  user_name: string;
};

const STOP_ICONS: Record<string, React.ReactNode> = {
  landmark: <MapPin size={16} />,
  restaurant: <Utensils size={16} />,
  activity: <Camera size={16} />,
  hotel: <Bed size={16} />,
  shopping: <ShoppingBag size={16} />,
  other: <Star size={16} />,
};

const STOP_TYPES = ["landmark", "restaurant", "activity", "hotel", "shopping", "other"];

export default function TripPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showAddStop, setShowAddStop] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // New stop form
  const [newStopName, setNewStopName] = useState("");
  const [newStopLocation, setNewStopLocation] = useState("");
  const [newStopType, setNewStopType] = useState("landmark");
  const [newStopNotes, setNewStopNotes] = useState("");
  const [newStopDate, setNewStopDate] = useState("");
  
  // Place autocomplete
  const [nameSuggestions, setNameSuggestions] = useState<{name: string; location: string}[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse traviis
  const [savedStops, setSavedStops] = useState<SavedStop[]>([]);
  const [searchResults, setSearchResults] = useState<TraviStop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadTripData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    setCurrentUserId(user.id);

    // Load trip plan
    const { data: planData, error: planError } = await supabase
      .from("trip_plans")
      .select("*")
      .eq("id", tripId)
      .single();

    if (planError || !planData) {
      router.push("/plan-trip");
      return;
    }

    setPlan(planData);

    // Load stops
    const { data: stopsData } = await supabase
      .from("trip_plan_stops")
      .select("*")
      .eq("trip_plan_id", tripId)
      .order("order_index");

    setStops(stopsData ?? []);

    // Load collaborators
    const { data: collabData } = await supabase
      .from("trip_plan_collaborators")
      .select("*")
      .eq("trip_plan_id", tripId);

    setCollaborators(collabData ?? []);

    // Load saved stops
    const { data: savedData } = await supabase
      .from("saved_stops")
      .select(`
        id,
        stop_id,
        stops:stop_id (
          id,
          name,
          location,
          type,
          traviis:travi_id (
            id,
            title,
            profiles:user_id ( username, full_name )
          )
        )
      `)
      .eq("user_id", user.id);

    if (savedData) {
      const mapped: SavedStop[] = savedData
        .filter((s: any) => s.stops)
        .map((s: any) => ({
          id: s.id,
          stop_id: s.stop_id,
          name: s.stops.name,
          location: s.stops.location,
          type: s.stops.type,
          travi_title: s.stops.traviis?.title ?? "Unknown",
          user_name: s.stops.traviis?.profiles?.full_name || s.stops.traviis?.profiles?.username || "Unknown",
        }));
      setSavedStops(mapped);
    }

    setLoading(false);
  }, [tripId, router]);

  useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();

    const stopsChannel = supabase
      .channel(`trip_stops_${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_plan_stops", filter: `trip_plan_id=eq.${tripId}` },
        () => {
          loadTripData();
        }
      )
      .subscribe();

    const collabChannel = supabase
      .channel(`trip_collabs_${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_plan_collaborators", filter: `trip_plan_id=eq.${tripId}` },
        () => {
          loadTripData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stopsChannel);
      supabase.removeChannel(collabChannel);
    };
  }, [tripId, loadTripData]);

  const generateInviteLink = async () => {
    const supabase = createClient();
    const token = crypto.randomUUID();

    await supabase.from("trip_plan_collaborators").insert({
      trip_plan_id: tripId,
      invite_token: token,
      status: "pending",
    });

    const link = `${window.location.origin}/plan-trip/invite/${token}`;
    setInviteLink(link);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    const supabase = createClient();
    const token = crypto.randomUUID();

    await supabase.from("trip_plan_collaborators").insert({
      trip_plan_id: tripId,
      invited_email: inviteEmail.trim().toLowerCase(),
      invite_token: token,
      status: "pending",
    });

    // In a real app, you'd send an email here
    setInviteEmail("");
    setInviting(false);
    loadTripData();
  };

  // Search for places by name (hotels, restaurants, etc.)
  const searchPlaceByName = async (query: string) => {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    if (!query.trim() || query.length < 3) {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
      return;
    }

    nameDebounceRef.current = setTimeout(async () => {
      try {
        // Use Nominatim to search for places
        const typeKeywords: Record<string, string> = {
          hotel: "hotel",
          restaurant: "restaurant",
          landmark: "tourism",
          activity: "attraction",
          shopping: "shop",
          other: "",
        };
        const keyword = typeKeywords[newStopType] || "";
        const searchQuery = keyword ? `${query} ${keyword}` : query;
        
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=8&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data = await res.json();
        
        const suggestions = data.map((r: any) => ({
          name: r.name || r.display_name.split(",")[0].trim(),
          location: r.display_name.split(",").slice(1, 4).join(",").trim(),
        })).filter((s: any) => s.name);
        
        setNameSuggestions(suggestions);
        setShowNameSuggestions(suggestions.length > 0);
      } catch {
        setNameSuggestions([]);
      }
    }, 350);
  };

  // Search for locations
  const searchLocation = async (query: string) => {
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    locationDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=en`,
          { headers: { "User-Agent": "TraviApp/1.0" } }
        );
        const data = await res.json();
        const suggestions = data.map((r: any) => 
          r.display_name.split(",").slice(0, 3).join(",").trim()
        );
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(suggestions.length > 0);
      } catch {
        setLocationSuggestions([]);
      }
    }, 350);
  };

  const addStop = async () => {
    if (!newStopName.trim() || !currentUserId) return;

    const supabase = createClient();
    const maxOrder = stops.length > 0 ? Math.max(...stops.map(s => s.order_index)) : -1;

    await supabase.from("trip_plan_stops").insert({
      trip_plan_id: tripId,
      added_by: currentUserId,
      name: newStopName.trim(),
      location: newStopLocation.trim() || null,
      type: newStopType,
      notes: newStopNotes.trim() || null,
      order_index: maxOrder + 1,
    });

    setNewStopName("");
    setNewStopLocation("");
    setNewStopType("landmark");
    setNewStopNotes("");
    setNewStopDate("");
    setShowAddStop(false);
  };

  const importStop = async (source: SavedStop | TraviStop, fromSaved: boolean) => {
    if (!currentUserId) return;

    const supabase = createClient();
    const maxOrder = stops.length > 0 ? Math.max(...stops.map(s => s.order_index)) : -1;

    await supabase.from("trip_plan_stops").insert({
      trip_plan_id: tripId,
      added_by: currentUserId,
      name: source.name,
      location: source.location,
      type: source.type,
      source_stop_id: fromSaved ? (source as SavedStop).stop_id : (source as TraviStop).id,
      source_user_name: source.user_name,
      order_index: maxOrder + 1,
    });

    setShowBrowse(false);
  };

  const deleteStop = async (stopId: string) => {
    const supabase = createClient();
    await supabase.from("trip_plan_stops").delete().eq("id", stopId);
  };

  const searchTraviis = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("stops")
      .select(`
        id,
        name,
        location,
        type,
        traviis:travi_id (
          id,
          title,
          is_public,
          profiles:user_id ( username, full_name )
        )
      `)
      .ilike("name", `%${searchQuery}%`)
      .limit(20);

    if (data) {
      const mapped: TraviStop[] = data
        .filter((s: any) => s.traviis?.is_public)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.location,
          type: s.type,
          travi_id: s.traviis.id,
          travi_title: s.traviis.title,
          user_name: s.traviis.profiles?.full_name || s.traviis.profiles?.username || "Unknown",
        }));
      setSearchResults(mapped);
    }

    setSearching(false);
  };

  if (loading || !plan) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#050d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>Loading trip plan...</div>
      </main>
    );
  }

  const isOwner = currentUserId === plan.owner_id;
  const activeCollaborators = collaborators.filter(c => c.status === "accepted");
  const pendingInvites = collaborators.filter(c => c.status === "pending");

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#050d1a", padding: "24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <Link
            href="/plan-trip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            <ArrowLeft size={16} /> All Trip Plans
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: plan.cover_gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                flexShrink: 0,
              }}
            >
              {plan.country_flag || "🌍"}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ color: "#ffffff", fontSize: "28px", fontWeight: "800", marginBottom: "4px" }}>
                {plan.title}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                {plan.destination || "Destination TBD"} · {stops.length} stops planned
              </p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(201,168,76,0.4)",
                backgroundColor: "rgba(201,168,76,0.1)",
                color: "#c9a84c",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <UserPlus size={16} /> Invite
            </button>
          </div>

          {/* Collaborators bar */}
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={14} color="rgba(255,255,255,0.4)" />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              {activeCollaborators.length + 1} {activeCollaborators.length === 0 ? "person" : "people"} planning
              {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button
            onClick={() => setShowAddStop(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: "#0f1729",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Plus size={16} /> Add Stop
          </button>
          <button
            onClick={() => setShowBrowse(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.15)",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Bookmark size={16} /> Import from Traviis
          </button>
        </div>

        {/* Stops list */}
        {stops.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 24px",
            borderRadius: "20px",
            border: "2px dashed rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}>
            <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>📍</span>
            <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
              No stops yet
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", maxWidth: "320px", margin: "0 auto" }}>
              Start adding places you want to visit! You can add stops manually or import them from other traviis.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.2)", cursor: "grab" }}>
                  <GripVertical size={16} />
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "700", width: "24px" }}>
                  {index + 1}
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(201,168,76,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c9a84c",
                  }}
                >
                  {STOP_ICONS[stop.type] || <Star size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#ffffff", fontSize: "15px", fontWeight: "600" }}>
                    {stop.name}
                  </div>
                  {stop.location && (
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                      {stop.location}
                    </div>
                  )}
                  {stop.source_user_name && (
                    <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "11px", marginTop: "2px" }}>
                      from {stop.source_user_name}&apos;s travi
                    </div>
                  )}
                </div>
                {stop.notes && (
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "12px",
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={stop.notes}
                  >
                    {stop.notes}
                  </div>
                )}
                <button
                  onClick={() => deleteStop(stop.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    color: "rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Stop Modal */}
      {showAddStop && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onClick={() => setShowAddStop(false)}
        >
          <div
            style={{
              backgroundColor: "#0f1729",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "440px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: "800", marginBottom: "20px" }}>
              Add a Stop
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Name with autocomplete */}
              <div style={{ position: "relative" }}>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Name *
                </label>
                <input
                  value={newStopName}
                  onChange={(e) => {
                    setNewStopName(e.target.value);
                    searchPlaceByName(e.target.value);
                  }}
                  onFocus={() => nameSuggestions.length > 0 && setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  placeholder="e.g., Sofitel Legend Santa Clara, Nobu Restaurant..."
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {/* Name suggestions dropdown */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "#0b1d35",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      overflow: "hidden",
                      zIndex: 60,
                      maxHeight: "200px",
                      overflowY: "auto",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {nameSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onMouseDown={() => {
                          setNewStopName(sug.name);
                          setNewStopLocation(sug.location);
                          setShowNameSuggestions(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          padding: "10px 14px",
                          border: "none",
                          borderBottom: idx < nameSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          background: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(201,168,76,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600" }}>{sug.name}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{sug.location}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location with autocomplete */}
              <div style={{ position: "relative" }}>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Location
                </label>
                <input
                  value={newStopLocation}
                  onChange={(e) => {
                    setNewStopLocation(e.target.value);
                    searchLocation(e.target.value);
                  }}
                  onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder="e.g., Cartagena, Colombia"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {/* Location suggestions dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "#0b1d35",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      overflow: "hidden",
                      zIndex: 60,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {locationSuggestions.map((loc, idx) => (
                      <button
                        key={idx}
                        onMouseDown={() => {
                          setNewStopLocation(loc);
                          setShowLocationSuggestions(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          border: "none",
                          borderBottom: idx < locationSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          background: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(201,168,76,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <MapPin size={14} color="#c9a84c" />
                        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px" }}>{loc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Type
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {STOP_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewStopType(type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: newStopType === type
                          ? "1px solid rgba(201,168,76,0.6)"
                          : "1px solid rgba(255,255,255,0.15)",
                        backgroundColor: newStopType === type
                          ? "rgba(201,168,76,0.15)"
                          : "rgba(255,255,255,0.05)",
                        color: newStopType === type ? "#c9a84c" : "rgba(255,255,255,0.6)",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textTransform: "capitalize",
                      }}
                    >
                      {STOP_ICONS[type]} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Planned Date */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Planned Date (optional)
                </label>
                <input
                  type="date"
                  value={newStopDate}
                  onChange={(e) => setNewStopDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    colorScheme: "dark",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                  Notes
                </label>
                <textarea
                  value={newStopNotes}
                  onChange={(e) => setNewStopNotes(e.target.value)}
                  placeholder="Any notes about this stop..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  onClick={() => setShowAddStop(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "transparent",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addStop}
                  disabled={!newStopName.trim()}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    background: newStopName.trim()
                      ? "linear-gradient(135deg, #c9a84c, #e8c96a)"
                      : "rgba(255,255,255,0.1)",
                    color: newStopName.trim() ? "#0f1729" : "rgba(255,255,255,0.3)",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: newStopName.trim() ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  Add Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onClick={() => setShowInvite(false)}
        >
          <div
            style={{
              backgroundColor: "#0f1729",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "440px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>
              Invite Collaborators
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "24px" }}>
              Share a link or invite by email to plan together in real-time.
            </p>

            {/* Link invite */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                Share Link
              </label>
              {inviteLink ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={inviteLink}
                    readOnly
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    onClick={copyInviteLink}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: copied ? "rgba(34,197,94,0.2)" : "rgba(201,168,76,0.2)",
                      color: copied ? "#22c55e" : "#c9a84c",
                      cursor: "pointer",
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateInviteLink}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(201,168,76,0.4)",
                    backgroundColor: "rgba(201,168,76,0.1)",
                    color: "#c9a84c",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Generate Invite Link
                </button>
              )}
            </div>

            {/* Email invite */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                Invite by Email
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={sendEmailInvite}
                  disabled={!inviteEmail.trim() || inviting}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: inviteEmail.trim() && !inviting
                      ? "linear-gradient(135deg, #c9a84c, #e8c96a)"
                      : "rgba(255,255,255,0.1)",
                    color: inviteEmail.trim() && !inviting ? "#0f1729" : "rgba(255,255,255,0.3)",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: inviteEmail.trim() && !inviting ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  Pending Invites
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "13px",
                      }}
                    >
                      {inv.invited_email || "Link invite"} · pending
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowInvite(false)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "20px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.6)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Browse / Import Modal */}
      {showBrowse && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onClick={() => setShowBrowse(false)}
        >
          <div
            style={{
              backgroundColor: "#0f1729",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: "800" }}>
                Import Stops
              </h2>
              <button
                onClick={() => setShowBrowse(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Saved stops */}
            {savedStops.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
                  Your Saved Stops
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {savedStops.map((stop) => (
                    <div
                      key={stop.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(201,168,76,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#c9a84c",
                        }}
                      >
                        {STOP_ICONS[stop.type] || <Star size={14} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600" }}>{stop.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                          {stop.location} · from {stop.user_name}
                        </div>
                      </div>
                      <button
                        onClick={() => importStop(stop, true)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "rgba(201,168,76,0.2)",
                          color: "#c9a84c",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search traviis */}
            <div>
              <h3 style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>
                Search All Traviis
              </h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchTraviis()}
                    placeholder="Search stops by name..."
                    style={{
                      width: "100%",
                      padding: "12px 12px 12px 40px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  onClick={searchTraviis}
                  disabled={!searchQuery.trim() || searching}
                  style={{
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: searchQuery.trim() && !searching ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {searchResults.map((stop) => (
                    <div
                      key={stop.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(201,168,76,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#c9a84c",
                        }}
                      >
                        {STOP_ICONS[stop.type] || <Star size={14} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600" }}>{stop.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                          {stop.location} · from {stop.user_name}&apos;s &quot;{stop.travi_title}&quot;
                        </div>
                      </div>
                      <Link
                        href={`/travi/${stop.travi_id}`}
                        target="_blank"
                        style={{
                          padding: "6px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        onClick={() => importStop(stop, false)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "rgba(201,168,76,0.2)",
                          color: "#c9a84c",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
