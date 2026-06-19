// lib/utils.ts — Shared utility functions for ThisFriday web app

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  // Parse as local date to avoid timezone shifts
  const parts = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);

  if (date.getTime() === today.getTime()) return 'Tonight';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDateTime(dateStr: string | null | undefined, timeStr?: string | null): string {
  const d = formatDate(dateStr);
  if (!timeStr) return d;
  const t = formatTime(timeStr);
  return `${d} · ${t}`;
}

export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatEventDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isEventActive(dateStr: string | null, endTimeStr?: string | null): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const eventDate = new Date(dateStr);
  if (endTimeStr) {
    const [h, m] = endTimeStr.split(':').map(Number);
    const endDate = new Date(eventDate);
    endDate.setHours(h, m, 0, 0);
    return now >= eventDate && now <= endDate;
  }
  // Default: active if within 6 hours after start
  const sixHoursAfter = new Date(eventDate.getTime() + 6 * 60 * 60 * 1000);
  return now >= eventDate && now <= sixHoursAfter;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '…';
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getNextFriday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = ((5 - day) + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
