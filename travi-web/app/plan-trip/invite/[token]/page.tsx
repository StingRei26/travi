"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type InviteStatus = "loading" | "success" | "error" | "already_member";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripTitle, setTripTitle] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const acceptInvite = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to auth with callback to come back here
        router.push(`/auth?callback=/plan-trip/invite/${token}`);
        return;
      }

      // Find the invite
      const { data: invite, error: inviteError } = await supabase
        .from("trip_plan_collaborators")
        .select("*, trip_plans(*)")
        .eq("invite_token", token)
        .single();

      if (inviteError || !invite) {
        setStatus("error");
        setErrorMessage("This invite link is invalid or has expired.");
        return;
      }

      // Check if user is already the owner
      if (invite.trip_plans.owner_id === user.id) {
        setStatus("already_member");
        setTripId(invite.trip_plan_id);
        setTripTitle(invite.trip_plans.title);
        return;
      }

      // Check if user is already a collaborator
      const { data: existing } = await supabase
        .from("trip_plan_collaborators")
        .select("id")
        .eq("trip_plan_id", invite.trip_plan_id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        setStatus("already_member");
        setTripId(invite.trip_plan_id);
        setTripTitle(invite.trip_plans.title);
        return;
      }

      // Accept the invite
      if (invite.user_id === null) {
        // This is a link invite, update it with the user
        await supabase
          .from("trip_plan_collaborators")
          .update({
            user_id: user.id,
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invite.id);
      } else {
        // This was an email invite to someone else, create new record
        await supabase.from("trip_plan_collaborators").insert({
          trip_plan_id: invite.trip_plan_id,
          user_id: user.id,
          invite_token: crypto.randomUUID(),
          status: "accepted",
          accepted_at: new Date().toISOString(),
        });
      }

      setStatus("success");
      setTripId(invite.trip_plan_id);
      setTripTitle(invite.trip_plans.title);
    };

    acceptInvite();
  }, [token, router]);

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#050d1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        backgroundColor: "#0f1729",
        borderRadius: "24px",
        padding: "40px",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        {status === "loading" && (
          <>
            <Loader2 size={48} color="#c9a84c" style={{ animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
            <h2 style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
              Accepting Invite...
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Please wait while we add you to the trip.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", marginBottom: "8px" }}>
              You&apos;re In! 🎉
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", marginBottom: "24px" }}>
              You&apos;ve been added to <strong style={{ color: "#ffffff" }}>{tripTitle}</strong>. You can now collaborate on the trip plan in real-time!
            </p>
            <Link
              href={`/plan-trip/${tripId}`}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                color: "#0f1729",
                fontSize: "15px",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Start Planning
            </Link>
          </>
        )}

        {status === "already_member" && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(201,168,76,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircle size={32} color="#c9a84c" />
            </div>
            <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", marginBottom: "8px" }}>
              You&apos;re Already In!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", marginBottom: "24px" }}>
              You&apos;re already part of <strong style={{ color: "#ffffff" }}>{tripTitle}</strong>. Jump back in and keep planning!
            </p>
            <Link
              href={`/plan-trip/${tripId}`}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
                color: "#0f1729",
                fontSize: "15px",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Open Trip Plan
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(248,113,113,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <XCircle size={32} color="#f87171" />
            </div>
            <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", marginBottom: "8px" }}>
              Invalid Invite
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", marginBottom: "24px" }}>
              {errorMessage}
            </p>
            <Link
              href="/plan-trip"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Go to My Trip Plans
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
