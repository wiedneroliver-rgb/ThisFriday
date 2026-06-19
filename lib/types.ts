// lib/types.ts — Shared TypeScript interfaces for ThisFriday web app

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio?: string | null;
  phone?: string | null;
  age_verified?: boolean | null;
  terms_accepted?: boolean | null;
  has_seen_tour?: boolean | null;
  city?: string | null;
}

export interface HostedEvent {
  id: string;
  host_id: string;
  title: string;
  location: string | null;
  date: string;
  end_time?: string | null;
  start_time?: string | null;
  flare: string | null;
  photo_url: string | null;
  description: string | null;
  visibility: string | null;
  city?: string | null;
  queue_mode?: string | null;
  default_plus_ones?: number | null;
  created_at: string;
  venue_id?: number | null;
  address?: string | null;
  event_id?: number | null;
}

export interface Event {
  id: number;
  title: string;
  venue: string;
  date: string;
  start_time: string | null;
  end_time?: string | null;
  description: string | null;
  poster_url: string | null;
  city?: string | null;
  is_featured?: boolean | null;
  guest_list_enabled?: boolean | null;
  guest_list_cap?: number | null;
  ticket_url?: string | null;
  promo_code?: string | null;
  eventbrite_id?: string | null;
}

export interface Venue {
  id: number;
  name: string;
  normalized_name: string | null;
  city: string;
  image_url: string | null;
}

export interface HostedEventGuest {
  hosted_event_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined' | 'collaborator';
  invited_by?: string | null;
  invite_allowance?: number | null;
}

export interface AppNotification {
  id: number;
  user_id: string;
  type: string;
  actor_id: string | null;
  scene_id: string | null;
  event_id: number | null;
  message: string | null;
  read: boolean;
  created_at: string | null;
  profiles?: Profile | null;
}

export interface SceneComment {
  id: string;
  hosted_event_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  is_pinned: boolean | null;
  profile?: Profile;
  replies?: SceneComment[];
  likeCount?: number;
  likedByMe?: boolean;
}

export interface SceneSong {
  id: string;
  hosted_event_id: string;
  user_id: string;
  title: string;
  artist: string;
  apple_music_id: string | null;
  spotify_id: string | null;
  artwork_url: string | null;
  created_at: string;
  status: string | null;
  voteCount?: number;
  votedByMe?: boolean;
}

export interface SceneSongVote {
  id: string;
  song_id: string;
  user_id: string;
}

export interface ScenePhoto {
  id: string;
  scene_id: string;
  user_id: string;
  photo_url: string;
  folder: 'public' | 'friends';
  created_at: string;
}

export interface EventPhoto {
  id: string;
  event_id: number;
  user_id: string;
  photo_url: string;
  folder: 'public' | 'friends';
  created_at: string;
}

export interface GuestListEntry {
  id: string;
  event_id: number;
  user_id: string | null;
  display_name: string;
  phone_number: string;
  created_at: string;
}

export interface FriendGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FriendGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  invited_by: string | null;
  created_at: string;
  profile?: Profile;
}

export interface UserGalleryItem {
  id: string;
  user_id: string;
  photo_url: string;
  source_type: string | null;
  source_photo_id: string | null;
  created_at: string;
}

export interface GoingRow {
  user_id: string;
  event_id: number;
}

export interface VenueGoingRow {
  user_id: string;
  venue_id: number;
  date: string;
}

// ─── Flare system ─────────────────────────────────────────────────────────────

export interface FlarePreset {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const FLARE_PRESETS: FlarePreset[] = [
  { key: 'house_party', label: 'House Party', icon: '🏠', color: '#6b5020' },
  { key: 'pregame', label: 'Pregame', icon: '🥂', color: '#4a6b20' },
  { key: 'bar_crawl', label: 'Bar Crawl', icon: '🚶', color: '#20506b' },
  { key: 'darty', label: 'Darty', icon: '☀️', color: '#c4a030' },
  { key: 'kickback', label: 'Kickback', icon: '🛋️', color: '#6b4060' },
  { key: 'function', label: 'Function', icon: '🎵', color: '#8050c0' },
  { key: 'concert', label: 'Concert', icon: '🎤', color: '#c04050' },
  { key: 'club_night', label: 'Club Night', icon: '✨', color: '#5030a0' },
  { key: 'birthday', label: 'Birthday', icon: '🎂', color: '#c45a8a' },
  { key: 'tailgate', label: 'Tailgate', icon: '🏈', color: '#6b4020' },
];

export const FLARE_MAP: Record<string, FlarePreset> = Object.fromEntries(
  FLARE_PRESETS.map((f) => [f.key, f])
);

export function getFlare(key: string | null | undefined): FlarePreset | null {
  if (!key) return null;
  return FLARE_MAP[key] || { key, label: key, icon: '✦', color: '#555555' };
}

// ─── Visibility ───────────────────────────────────────────────────────────────

export type PlanVisibility = 'private' | 'semi_public' | 'public';

export interface VisibilityOption {
  value: PlanVisibility;
  label: string;
  subtitle: string;
  icon: string;
}

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'private', label: 'Private', subtitle: 'Invite only', icon: '🔒' },
  { value: 'semi_public', label: 'Friends', subtitle: 'Discoverable by friends', icon: '👥' },
  { value: 'public', label: 'Public', subtitle: 'Anyone can find this', icon: '🌐' },
];

// ─── Canadian cities ──────────────────────────────────────────────────────────

export const CANADIAN_CITIES = [
  'Victoria',
  'Vancouver',
  'Toronto',
  'Montreal',
  'Calgary',
  'Edmonton',
  'Ottawa',
  'Winnipeg',
  'Quebec City',
  'Hamilton',
  'Halifax',
  'London',
  'Kitchener',
  'St. Catharines',
  'Windsor',
  'Kelowna',
  'Saskatoon',
  'Regina',
];
