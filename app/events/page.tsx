"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";
import PhotoViewer from "@/components/PhotoViewer";

interface HostedEvent {
  id: string;
  host_id: string;
  title: string;
  location: string;
  date: string;
  flare: string | null;
  photo_url: string | null;
  description: string | null;
  visibility: string | null;
  created_at: string;
}

interface ScenePhoto {
  id: string;
  scene_id: string;
  photo_url: string;
  folder: string;
  created_at: string;
}

interface EventPhoto {
  id: string;
  event_id: number;
  photo_url: string;
  folder: string;
  created_at: string;
}

interface AlbumItem {
  id: string;
  title: string;
  coverUrl: string | null;
  photoCount: number;
  date: string;
  type: "scene" | "event";
  sourceId: string;
}

interface Photo {
  id: string;
  photo_url: string;
  user_id: string;
}

interface GalleryPhoto {
  id: string;
  photo_url: string;
  source_type: string;
  created_at: string;
}

const FLARE_COLORS: Record<string, string> = {
  house_party: "#6b5020", pregame: "#4a6b20", bar_crawl: "#20506b",
  darty: "#c4a030", kickback: "#6b4060", function: "#8050c0",
  concert: "#c04050", club_night: "#5030a0", birthday: "#c45a8a", tailgate: "#6b4020",
};
const FLARE_LABELS: Record<string, string> = {
  house_party: "House Party", pregame: "Pregame", bar_crawl: "Bar Crawl",
  darty: "Darty", kickback: "Kickback", function: "Function",
  concert: "Concert", club_night: "Club Night", birthday: "Birthday", tailgate: "Tailgate",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date();
}

export default function EventsPage() {
  const router = useRouter();
  const [hosted, setHosted] = useState<HostedEvent[]>([]);
  const [going, setGoing] = useState<HostedEvent[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "albums">("upcoming");
  const [currentUserId, setCurrentUserId] = useState("");
  const [viewerPhotos, setViewerPhotos] = useState<Photo[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => { loadEvents(); }, []);

  useEffect(() => {
    if (tab === "albums" && currentUserId && albums.length === 0 && !albumsLoading) {
      loadAlbums(currentUserId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currentUserId]);

  async function loadEvents() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const userId = user.id.toLowerCase();
    setCurrentUserId(userId);

    const { data: hostedEvents } = await supabase
      .from("hosted_events").select("*").eq("host_id", userId)
      .order("date", { ascending: false });

    const { data: guestRows } = await supabase
      .from("hosted_event_guests").select("hosted_event_id")
      .eq("user_id", userId).eq("status", "accepted");

    const guestIds = (guestRows || []).map((r: { hosted_event_id: string }) => r.hosted_event_id);
    const hostedIds = new Set((hostedEvents || []).map((e: HostedEvent) => e.id));

    let goingEvents: HostedEvent[] = [];
    if (guestIds.length > 0) {
      const { data } = await supabase
        .from("hosted_events").select("*")
        .in("id", guestIds.filter((id: string) => !hostedIds.has(id)))
        .order("date", { ascending: false });
      goingEvents = data || [];
    }

    setHosted(hostedEvents || []);
    setGoing(goingEvents);
    setLoading(false);
  }

  async function loadAlbums(userId: string) {
    setAlbumsLoading(true);
    const supabase = createClient();

    // Get all scene IDs user is part of (hosted or attended)
    const { data: guestRows } = await supabase
      .from("hosted_event_guests").select("hosted_event_id")
      .eq("user_id", userId).eq("status", "accepted");
    const guestSceneIds = (guestRows || []).map((r: { hosted_event_id: string }) => r.hosted_event_id);

    const { data: hostedScenes } = await supabase
      .from("hosted_events").select("id,title,date,photo_url")
      .eq("host_id", userId);
    const hostedSceneIds = (hostedScenes || []).map((e: { id: string }) => e.id);

    const allSceneIds = [...new Set([...hostedSceneIds, ...guestSceneIds])];

    const albumItems: AlbumItem[] = [];

    // Scene photos
    if (allSceneIds.length > 0) {
      const { data: scenePhotos } = await supabase
        .from("scene_photos").select("id,scene_id,photo_url,created_at")
        .in("scene_id", allSceneIds)
        .order("created_at", { ascending: false });

      // Group by scene
      const byScene: Record<string, ScenePhoto[]> = {};
      for (const p of (scenePhotos || []) as ScenePhoto[]) {
        if (!byScene[p.scene_id]) byScene[p.scene_id] = [];
        byScene[p.scene_id].push(p);
      }

      const hostedSceneMap: Record<string, { title: string; date: string; photo_url: string | null }> = {};
      for (const s of (hostedScenes || [])) {
        hostedSceneMap[s.id] = { title: s.title, date: s.date, photo_url: s.photo_url };
      }

      // Fetch missing scene info
      const unknownIds = allSceneIds.filter(id => !hostedSceneMap[id] && byScene[id]);
      if (unknownIds.length > 0) {
        const { data: extraScenes } = await supabase
          .from("hosted_events").select("id,title,date,photo_url")
          .in("id", unknownIds);
        for (const s of (extraScenes || [])) {
          hostedSceneMap[s.id] = { title: s.title, date: s.date, photo_url: s.photo_url };
        }
      }

      for (const [sceneId, photos] of Object.entries(byScene)) {
        const sceneInfo = hostedSceneMap[sceneId];
        if (!sceneInfo) continue;
        albumItems.push({
          id: `scene-${sceneId}`,
          title: sceneInfo.title,
          coverUrl: photos[0]?.photo_url || sceneInfo.photo_url,
          photoCount: photos.length,
          date: sceneInfo.date,
          type: "scene",
          sourceId: sceneId,
        });
      }
    }

    // Event photos (Eventbrite events user uploaded to)
    const { data: eventPhotos } = await supabase
      .from("event_photos").select("id,event_id,photo_url,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if ((eventPhotos || []).length > 0) {
      const byEvent: Record<number, EventPhoto[]> = {};
      for (const p of (eventPhotos || []) as EventPhoto[]) {
        if (!byEvent[p.event_id]) byEvent[p.event_id] = [];
        byEvent[p.event_id].push(p);
      }

      const eventIds = Object.keys(byEvent).map(Number);
      const { data: events } = await supabase
        .from("events").select("id,title,date")
        .in("id", eventIds);
      const eventMap: Record<number, { title: string; date: string }> = {};
      for (const e of (events || [])) eventMap[e.id] = e;

      for (const [eventId, photos] of Object.entries(byEvent)) {
        const evt = eventMap[Number(eventId)];
        if (!evt) continue;
        albumItems.push({
          id: `event-${eventId}`,
          title: evt.title,
          coverUrl: photos[0]?.photo_url || null,
          photoCount: photos.length,
          date: evt.date,
          type: "event",
          sourceId: eventId,
        });
      }
    }

    // Sort by date desc
    albumItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAlbums(albumItems);

    // Saved gallery
    const { data: gallery } = await supabase
      .from("user_gallery").select("id,photo_url,source_type,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setGalleryPhotos(gallery || []);

    setAlbumsLoading(false);
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    await supabase.from("hosted_events").delete().eq("id", eventId);
    setHosted((prev) => prev.filter((e) => e.id !== eventId));
  }

  const allEvents = [...hosted, ...going];
  const upcoming = allEvents.filter((e) => !isPast(e.date));
  const past = allEvents.filter((e) => isPast(e.date));
  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <PageShell><div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        padding: "16px 16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          My Events
        </h1>
        <div style={{ display: "flex", gap: "0" }}>
          {(["upcoming", "past", "albums"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px", background: "none", border: "none",
                color: tab === t ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                fontWeight: tab === t ? 700 : 400,
                fontSize: "0.9rem", cursor: "pointer",
                borderBottom: tab === t ? "2px solid #F0EDE8" : "2px solid transparent",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
        {tab === "albums" ? (
          albumsLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
          ) : (
            <AlbumsTab
              albums={albums}
              galleryPhotos={galleryPhotos}
              onAlbumTap={(album) => {
                if (album.type === "scene") router.push(`/events/${album.sourceId}`);
                else router.push(`/event/${album.sourceId}`);
              }}
              onPhotoTap={(photos, index) => {
                setViewerPhotos(photos);
                setViewerIndex(index);
              }}
            />
          )
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
            <p style={{ fontSize: "1rem" }}>No {tab} events</p>
          </div>
        ) : (
          displayed.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              isOwn={event.host_id === currentUserId}
              onDelete={() => deleteEvent(event.id)}
              onTap={() => router.push(`/events/${event.id}`)}
            />
          ))
        )}
      </div>

      <BottomNav active="events" />

      {viewerPhotos.length > 0 && (
        <PhotoViewer
          photos={viewerPhotos}
          initialIndex={viewerIndex}
          currentUserId={currentUserId}
          onClose={() => setViewerPhotos([])}
        />
      )}
    </div></PageShell>
  );
}

function AlbumsTab({
  albums,
  galleryPhotos,
  onAlbumTap,
  onPhotoTap,
}: {
  albums: AlbumItem[];
  galleryPhotos: GalleryPhoto[];
  onAlbumTap: (album: AlbumItem) => void;
  onPhotoTap: (photos: Photo[], index: number) => void;
}) {
  return (
    <div>
      {/* Albums */}
      {albums.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
            Albums
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => onAlbumTap(album)}
                style={{
                  borderRadius: "12px", overflow: "hidden",
                  cursor: "pointer", position: "relative",
                  aspectRatio: "1",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                    🎉
                  </div>
                )}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)",
                }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px" }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.82rem", color: "#fff", lineHeight: 1.2 }}>
                    {album.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
                    {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved gallery */}
      {galleryPhotos.length > 0 && (
        <div>
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
            Saved
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {galleryPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => onPhotoTap(galleryPhotos.map(p => ({ id: p.id, photo_url: p.photo_url, user_id: "" })), index)}
                style={{ aspectRatio: "1", cursor: "pointer", overflow: "hidden", borderRadius: "4px" }}
              >
                <img src={photo.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {albums.length === 0 && galleryPhotos.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📷</div>
          <p>No albums yet</p>
          <p style={{ fontSize: "0.82rem" }}>Photos from your events will appear here</p>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, isOwn, onDelete, onTap }: {
  event: HostedEvent;
  isOwn: boolean;
  onDelete: () => void;
  onTap: () => void;
}) {
  const flareColor = event.flare ? (FLARE_COLORS[event.flare] || "#555") : "#555";
  const flareLabel = event.flare ? (FLARE_LABELS[event.flare] || event.flare) : null;
  const past = isPast(event.date);

  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", gap: "12px",
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        opacity: past ? 0.6 : 1,
        cursor: "pointer",
      }}
    >
      {event.photo_url ? (
        <img
          src={event.photo_url}
          alt=""
          style={{ width: 60, height: 60, borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 60, height: 60, borderRadius: "10px", flexShrink: 0,
          background: flareColor + "33",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem",
        }}>
          🎉
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>
            {event.title}
          </h3>
          {isOwn && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                background: "none", border: "none",
                color: "rgba(240,237,232,0.3)", cursor: "pointer",
                fontSize: "0.75rem", flexShrink: 0, padding: "0",
              }}
            >
              ✕
            </button>
          )}
        </div>
        <p style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.78rem", margin: "3px 0" }}>
          {event.location}
        </p>
        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: 0 }}>
          {formatDate(event.date)}
        </p>
        <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
          {isOwn && (
            <span style={{
              background: "rgba(255,255,255,0.08)", borderRadius: "20px",
              padding: "2px 8px", fontSize: "0.65rem", color: "rgba(240,237,232,0.5)",
            }}>
              Host
            </span>
          )}
          {flareLabel && (
            <span style={{
              background: flareColor + "33", color: flareColor,
              border: `1px solid ${flareColor}55`,
              borderRadius: "20px", padding: "2px 8px", fontSize: "0.65rem", fontWeight: 600,
            }}>
              {flareLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
