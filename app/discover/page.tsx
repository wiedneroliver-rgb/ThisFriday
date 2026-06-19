"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";
import CityPicker, { getSelectedCity } from "@/components/CityPicker";

interface Venue {
  id: number;
  name: string;
  normalized_name: string | null;
  city: string;
  image_url: string | null;
  goingCount?: number;
  friendsGoingCount?: number;
}

interface VenueGoingCounts {
  venue_id: number;
  going_count: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [popular, setPopular] = useState<Venue[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("Victoria");

  useEffect(() => {
    setCity(getSelectedCity());
    const handler = (e: Event) => setCity((e as CustomEvent).detail as string);
    window.addEventListener("cityChanged", handler);
    return () => window.removeEventListener("cityChanged", handler);
  }, []);

  const load = useCallback(async (currentCity: string) => {
    setLoading(true);
    const supabase = createClient();

    const { data: venueData } = await supabase
      .from("venues")
      .select("id,name,normalized_name,city,image_url")
      .eq("city", currentCity)
      .order("name", { ascending: true });

    if (!venueData || venueData.length === 0) {
      setVenues([]);
      setPopular([]);
      setLoading(false);
      return;
    }

    // Get going counts
    const { data: goingCounts } = await supabase
      .rpc("get_venue_going_counts") as { data: VenueGoingCounts[] | null };

    const countMap: Record<number, number> = {};
    for (const row of goingCounts || []) {
      countMap[row.venue_id] = row.going_count;
    }

    // Get friends going to venues
    let friendVenueIds = new Set<number>();
    if (userId) {
      const { data: friendRows } = await supabase
        .from("friends").select("friend_id").eq("user_id", userId);
      const friendIds = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
      if (friendIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { data: friendGoingRows } = await supabase
          .from("venue_going").select("venue_id")
          .in("user_id", friendIds).gte("date", today);
        friendVenueIds = new Set((friendGoingRows || []).map((r: { venue_id: number }) => r.venue_id));
      }
    }

    const enriched: Venue[] = venueData.map((v: Venue) => ({
      ...v,
      goingCount: countMap[v.id] || 0,
      friendsGoingCount: friendVenueIds.has(v.id) ? 1 : 0,
    }));

    const sorted = [...enriched].sort((a, b) => {
      const fa = (b.friendsGoingCount || 0) - (a.friendsGoingCount || 0);
      if (fa !== 0) return fa;
      return (b.goingCount || 0) - (a.goingCount || 0);
    });

    setVenues(enriched);
    setPopular(sorted.slice(0, 8));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(city); }, [city, load]);

  const filtered = search.trim()
    ? venues.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
    : venues;

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
          padding: "16px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: 0 }}>
              Discover
            </h1>
            <CityPicker />
          </div>
          <input
            type="text"
            placeholder="Search venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
              padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ paddingBottom: "80px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
          ) : venues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
              <p>No venues found in {city}</p>
            </div>
          ) : search.trim() ? (
            /* Search results */
            <div style={{ padding: "12px 16px" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", margin: "0 0 12px" }}>
                {filtered.length} venue{filtered.length !== 1 ? "s" : ""} found
              </p>
              {filtered.map((venue) => (
                <VenueRow key={venue.id} venue={venue} onClick={() => router.push(`/venues/${venue.id}`)} />
              ))}
            </div>
          ) : (
            <>
              {/* Popular venues carousel */}
              {popular.length > 0 && (
                <div style={{ padding: "20px 0 0" }}>
                  <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px 16px" }}>
                    Popular Tonight
                  </p>
                  <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "0 16px 16px", scrollbarWidth: "none" }}>
                    {popular.map((venue) => (
                      <PopularCard key={venue.id} venue={venue} onClick={() => router.push(`/venues/${venue.id}`)} />
                    ))}
                  </div>
                </div>
              )}

              {/* All venues */}
              <div style={{ padding: "4px 16px" }}>
                <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
                  All Venues · {city}
                </p>
                {filtered.map((venue) => (
                  <VenueRow key={venue.id} venue={venue} onClick={() => router.push(`/venues/${venue.id}`)} />
                ))}
              </div>
            </>
          )}
        </div>

        <BottomNav active="discover" />
      </div>
    </PageShell>
  );
}

function PopularCard({ venue, onClick }: { venue: Venue; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0, width: 150, cursor: "pointer",
        borderRadius: "14px", overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {venue.image_url ? (
        <img src={venue.image_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 100, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
          🏢
        </div>
      )}
      <div style={{ padding: "10px 10px 12px" }}>
        <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: "0 0 3px", lineHeight: 1.3 }}>{venue.name}</p>
        {(venue.goingCount || 0) > 0 && (
          <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.72rem", margin: 0 }}>
            {venue.goingCount} going
          </p>
        )}
      </div>
    </div>
  );
}

function VenueRow({ venue, onClick }: { venue: Venue; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
      }}
    >
      {venue.image_url ? (
        <img src={venue.image_url} alt="" style={{ width: 52, height: 52, borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: "10px", flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
        }}>
          🏢
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 2px" }}>{venue.name}</p>
        {(venue.goingCount || 0) > 0 && (
          <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: 0 }}>
            {venue.goingCount} going tonight
          </p>
        )}
      </div>
      <span style={{ color: "rgba(240,237,232,0.25)", fontSize: "1rem" }}>›</span>
    </div>
  );
}
