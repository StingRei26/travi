"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Calendar, MapPin, ArrowRight, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TripPlan = {
  id: string;
  title: string;
  destination: string | null;
  country: string | null;
  country_flag: string | null;
  planned_date: string | null;
  cover_gradient: string;
  is_active: boolean;
  created_at: string;
  collaborator_count?: number;
  stop_count?: number;
};

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

export default function PlanTripPage() {
  const router = useRouter();
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");

  useEffect(() => {
    loadTripPlans();
  }, []);

  const loadTripPlans = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/auth");
      return;
    }

    // Get plans where user is owner or collaborator
    const { data: ownedPlans } = await supabase
      .from("trip_plans")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const { data: collabPlans } = await supabase
      .from("trip_plan_collaborators")
      .select("trip_plan_id")
      .eq("user_id", user.id);

    let allPlans = ownedPlans ?? [];

    if (collabPlans && collabPlans.length > 0) {
      const collabIds = collabPlans.map(c => c.trip_plan_id);
      const { data: sharedPlans } = await supabase
        .from("trip_plans")
        .select("*")
        .in("id", collabIds);
      
      if (sharedPlans) {
        allPlans = [...allPlans, ...sharedPlans];
      }
    }

    // Get collaborator counts
    for (const plan of allPlans) {
      const { count: collabCount } = await supabase
        .from("trip_plan_collaborators")
        .select("*", { count: "exact", head: true })
        .eq("trip_plan_id", plan.id);
      
      const { count: stopCount } = await supabase
        .from("trip_plan_stops")
        .select("*", { count: "exact", head: true })
        .eq("trip_plan_id", plan.id);

      plan.collaborator_count = collabCount ?? 0;
      plan.stop_count = stopCount ?? 0;
    }

    setTripPlans(allPlans);
    setLoading(false);
  };

  const createTripPlan = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

    const { data, error } = await supabase
      .from("trip_plans")
      .insert({
        owner_id: user.id,
        title: newTitle.trim(),
        destination: newDestination.trim() || null,
        cover_gradient: gradient,
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/plan-trip/${data.id}`);
    }

    setCreating(false);
  };

  const deleteTripPlan = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Delete this trip plan? This cannot be undone.")) return;

    const supabase = createClient();
    await supabase.from("trip_plans").delete().eq("id", id);
    setTripPlans(prev => prev.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#050d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>Loading your trip plans...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#050d1a", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "32px" }}>🗺️</span>
            <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#ffffff", letterSpacing: "-1px" }}>
              Plan a Trip
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>
            Plan your next adventure solo or with friends. Add stops from other traviis and collaborate in real-time.
          </p>
        </div>

        {/* New Trip Button */}
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            width: "100%",
            padding: "24px",
            borderRadius: "16px",
            border: "2px dashed rgba(201,168,76,0.4)",
            backgroundColor: "rgba(201,168,76,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            cursor: "pointer",
            marginBottom: "32px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(201,168,76,0.7)";
            e.currentTarget.style.backgroundColor = "rgba(201,168,76,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)";
            e.currentTarget.style.backgroundColor = "rgba(201,168,76,0.06)";
          }}
        >
          <Plus size={24} color="#c9a84c" />
          <span style={{ color: "#c9a84c", fontSize: "18px", fontWeight: "700" }}>
            Start a New Trip Plan
          </span>
        </button>

        {/* Trip Plans List */}
        {tripPlans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <span style={{ fontSize: "64px", display: "block", marginBottom: "20px" }}>✈️</span>
            <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "700", marginBottom: "10px" }}>
              No trip plans yet
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px", maxWidth: "360px", margin: "0 auto" }}>
              Start planning your next adventure! Create a trip plan and invite friends to collaborate.
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px" }}>
              Your Trip Plans · {tripPlans.length}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tripPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plan-trip/${plan.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                  }}
                >
                  {/* Gradient circle */}
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      background: plan.cover_gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      flexShrink: 0,
                    }}
                  >
                    {plan.country_flag || "🌍"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: "#ffffff", fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>
                      {plan.title}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      {plan.destination && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                          <MapPin size={12} /> {plan.destination}
                        </span>
                      )}
                      {plan.planned_date && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                          <Calendar size={12} /> {plan.planned_date}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                        <Users size={12} /> {(plan.collaborator_count ?? 0) + 1}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                        {plan.stop_count ?? 0} stops
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={(e) => deleteTripPlan(plan.id, e)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px",
                      color: "rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#f87171";
                      e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.2)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <ArrowRight size={20} color="rgba(255,255,255,0.3)" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to My Traviis */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <Link
            href="/my-traviis"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", textDecoration: "none" }}
          >
            ← Back to My Traviis
          </Link>
        </div>
      </div>

      {/* New Trip Modal */}
      {showNewModal && (
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
          onClick={() => setShowNewModal(false)}
        >
          <div
            style={{
              backgroundColor: "#0f1729",
              borderRadius: "20px",
              padding: "32px",
              width: "100%",
              maxWidth: "440px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", marginBottom: "8px" }}>
              🗺️ New Trip Plan
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "24px" }}>
              Start planning your next adventure. You can invite collaborators later.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  Trip Name *
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Summer Europe Trip 2026"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>

              <div>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  Destination (optional)
                </label>
                <input
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g., Italy, Japan, Multiple countries..."
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  onClick={() => setShowNewModal(false)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "transparent",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createTripPlan}
                  disabled={!newTitle.trim() || creating}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: newTitle.trim() && !creating
                      ? "linear-gradient(135deg, #c9a84c, #e8c96a)"
                      : "rgba(255,255,255,0.1)",
                    color: newTitle.trim() && !creating ? "#0f1729" : "rgba(255,255,255,0.3)",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: newTitle.trim() && !creating ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  {creating ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
