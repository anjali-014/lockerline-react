// Dates and durations, always in the building's time zone so the demo reads the same everywhere.
const ZONE = 'Asia/Kolkata';

export function formatTime(ms) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(ms);
}

export function formatDay(ms) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short' })
    .format(ms);
}

export function formatWhen(ms) {
  return `${formatDay(ms)}, ${formatTime(ms)}`;
}

/** 158520 → "1d 20h", 12600 → "3h 30m", 300 → "5m". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatCode(code) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}