"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import PageShell from "@/components/PageShell";
import BottomNav from "@/components/BottomNav";
import DateSelector from "@/components/DateSelector";

interface Venue {
  id: number;
  name: string;
  city: string;
  image_url: string | null;
}

interface Event {
  id: number;
  title: string;
  date: string;
  start_time: string | null;
  description: string | null;
  poster_url: string | null;
  guest_list_enabled: boolean | null;
  is_featured: boolean | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function VenueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const venueId = Number(params.id);
  const { userId } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [goingEventIds, setGoingEventIds] = useState<Set<number>>(new Set());
  const [isVenueGoing, setIsVenueGoing] = useState(false);
  const [friendsGoing, setFriendsGoing] = useState<Profile[]>([]);
  const [goingCounts, setGoingCounts] = useState<Record<number, number>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [venueGoingLoading, setVenueGoingLoading] = useState(false);

  useEffect(() => {
    if (venueId && userId) loadVenue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, userId]);

  useEffect(() => {
    if (venue) loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, venue]);

  async function loadVenue() {
    const supabase = createClient();

    const { data: venueData } = await supabase
      .from("venues").select("id,name,city,image_url").eq("id", venueId).single();
    if (!venueData) { router.push("/discover"); return; }
    setVenue(venueData);

    // Check if user is going to venue today
    const today = new Date().toISOString().split("T")[0];
    const { data: vgRow } = await supabase
      .from("venue_going").select("user_id")
      .eq("user_id", userId).eq("venue_id", venueId).eq("date", today).maybeSingle();
    setIsVenueGoing(!!vgRow);

    // Friends going to venue
    const { data: friendRows } = await supabase
      .from("friends").select("friend_id").eq("user_id", userId);
    const friendIds = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);

    if (friendIds.length > 0) {
      const { data: friendGoingRows } = await supabase
        .from("venue_going").select("user_id")
        .in("user_id", friendIds).eq("venue_id", venueId).eq("date", today);
      const goingFriendIds = (friendGoingRows || []).map((r: { user_id: string }) => r.user_id);
      if (goingFriendIds.length > 0) {
        const { data: friendProfiles } = await supabase
          .from("profiles").select("id,display_name,avatar_url").in("id", goingFriendIds);
        setFriendsGoing(friendProfiles || []);
      }
    }

    setLoading(false);
  }

  async function loadEvents() {
    if (!venue) return;
    const supabase = createClient();

    const dateStr = selectedDate;
    const nextDay = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split("T")[0];
    const { data: eventData } = await supabase
      .from("events")
      .select("id,title,date,start_time,description,poster_url,guest_list_enabled,is_featured")
      .eq("venue", venue.name)
      .gte("date", dateStr)
      .lt("date", nextDay)
      .order("start_time", { ascending: true });

    setEvents(eventData || []);

    if (eventData && eventData.length > 0) {
      const eventIds = eventData.map((e: Event) => e.id);

      // Going counts
      const { data: goingCts } = await supabase
        .rpc("get_event_going_counts") as { data: { event_id: number; going_count: number }[] | null };
      const ctMap: Record<number, number> = {};
      for (const row of goingCts || []) ctMap[row.event_id] = row.going_count;
      setGoingCounts(ctMap);

      // My going status
      if (userId) {
        const { data: myGoing } = await supabase
          .from("going").select("event_id").eq("user_id", userId).in("event_id", eventIds);
        setGoingEventIds(new Set((myGoing || []).map((r: { event_id: number }) => r.event_id)));
      }
    }
  }

  async function toggleEventGoing(eventId: number) {
    if (!userId || actionLoading !== null) return;
    setActionLoading(eventId);
    const supabase = createClient();
    if (goingEventIds.has(eventId)) {
      await supabase.from("going").delete().eq("user_id", userId).eq("event_id", eventId);
      setGoingEventIds((p) => { const s = new Set(p); s.delete(eventId); return s; });
      setGoingCounts((p) => ({ ...p, [eventId]: Math.max(0, (p[eventId] || 1) - 1) }));
    } else {
      await supabase.from("going").insert({ user_id: userId, event_id: eventId });
      setGoingEventIds((p) => new Set(p).add(eventId));
      setGoingCounts((p) => ({ ...p, [eventId]: (p[eventId] || 0) + 1 }));
    }
    setActionLoading(null);
  }

  async function toggleVenueGoing() {
    if (!userId || venueGoingLoading) return;
    setVenueGoingLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    if (isVenueGoing) {
      await supabase.from("venue_going").delete()
        .eq("user_id", userId).eq("venue_id", venueId).eq("date", today);
      setIsVenueGoing(false);
    } else {
      await supabase.from("venue_going").insert({ user_id: userId, venue_id: venueId, date: today });
      setIsVenueGoing(true);
    }
    setVenueGoingLoading(false);
  }

  if (loading || !venue) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
  }

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Hero */}
        <div style={{ position: "relative" }}>
          {venue.image_url ? (
            <>
              <img src={venue.image_url} alt={venue.name} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />
            </>
          ) : (
            <div style={{ height: 160, background: "rgba(255,255,255,0.03)" }} />
          )}
          <button
            onClick={() => router.back()}
            style={{
              position: "absolute", top: "52px", left: "16px",
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1rem",
            }}
          >
            ‹
          </button>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 16px" }}>
            <h1 style={{ fontWeight: 900, fontSize: "1.8rem", letterSpacing: "-0.03em", margin: "0 0 4px", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
              {venue.name}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", margin: 0 }}>📍 {venue.city}</p>
          </div>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {/* Venue going toggle + friends */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <button
              onClick={toggleVenueGoing}
              disabled={venueGoingLoading}
              style={{
                background: isVenueGoing ? "#F0EDE8" : "rgba(255,255,255,0.08)",
                color: isVenueGoing ? "#080808" : "#F0EDE8",
                border: isVenueGoing ? "none" : "1px solid rgba(255,255,255,0.15)",
                borderRadius: "22px", padding: "9px 20px",
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                opacity: venueGoingLoading ? 0.6 : 1,
              }}
            >
              {isVenueGoing ? "Going Tonight ✓" : "I'm Going Tonight"}
            </button>
            {friendsGoing.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "-6px" }}>
                {friendsGoing.slice(0, 4).map((f) => (
                  <div key={f.id} style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", overflow: "hidden",
                    border: "2px solid #080808", marginLeft: "-6px",
                    flexShrink: 0,
                  }}>
                    {f.avatar_url && <img src={f.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                ))}
                <span style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.75rem", marginLeft: "8px" }}>
                  {friendsGoing.length} friend{friendsGoing.length !== 1 ? "s" : ""} going
                </span>
              </div>
            )}
          </div>

          {/* Make a plan button */}
          <button
            onClick={() => router.push(`/create?venueId=${venue.id}&venueName=${encodeURIComponent(venue.name)}`)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px", padding: "12px",
              color: "#F0EDE8", fontWeight: 600, fontSize: "0.9rem",
              cursor: "pointer", marginBottom: "20px",
            }}
          >
            + Make a Plan Here
          </button>

          {/* Date selector */}
          <DateSelector selected={selectedDate} onChange={setSelectedDate} />

          {/* Events */}
          <div style={{ marginTop: "16px", paddingBottom: "80px" }}>
            {events.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,237,232,0.3)" }}>
                <p>No events on this date</p>
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => router.push(`/event/${evt.id}`)}
                  style={{
                    display: "flex", gap: "12px", alignItems: "center",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                  }}
                >
                  {evt.poster_url ? (
                    <img src={evt.poster_url} alt="" style={{ width: 60, height: 60, borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: "10px", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                      🎵
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 2px" }}>{evt.title}</p>
                    {evt.start_time && (
                      <p style={{ color: "rgba(240,237,232,0.45)", fontSize: "0.75rem", margin: "0 0 6px" }}>
                        {evt.start_time}
                      </p>
                    )}
                    {(goingCounts[evt.id] || 0) > 0 && (
                      <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.72rem", margin: 0 }}>
                        {goingCounts[evt.id]} going
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEventGoing(evt.id); }}
                    disabled={actionLoading === evt.id}
                    style={{
                      background: goingEventIds.has(evt.id) ? "rgba(255,255,255,0.1)" : "#F0EDE8",
                      color: goingEventIds.has(evt.id) ? "#F0EDE8" : "#080808",
                      border: goingEventIds.has(evt.id) ? "1px solid rgba(255,255,255,0.15)" : "none",
                      borderRadius: "20px", padding: "7px 14px",
                      fontWeight: 700, fontSize: "0.78rem",
                      cursor: actionLoading === evt.id ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {goingEventIds.has(evt.id) ? "Going ✓" : "Going"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <BottomNav active="discover" />
      </div>
    </PageShell>
  );
}
