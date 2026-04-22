export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Map Intl short weekday names to DAY_KEYS indices
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export type DayHours = { open: string; close: string } | null;
export type HoursMap = Record<string, DayHours>;
export type OpenStatus = { isOpen: boolean; label: string; closingSoon: boolean };

function formatTime(time: string): string {
  const [hourStr, min] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return min === '00' ? `${displayHour} ${period}` : `${displayHour}:${min} ${period}`;
}

function minutesFromTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getNextOpenDay(hours: HoursMap, todayIndex: number): string {
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (todayIndex + i) % 7;
    const key = DAY_KEYS[dayIndex];
    const dayHours = hours[key];
    if (dayHours) {
      const label = i === 1 ? 'tomorrow' : DAY_LABELS[dayIndex];
      return `${label} at ${formatTime(dayHours.open)}`;
    }
  }
  return 'soon';
}

export function getOpenStatus(hours: HoursMap | null | undefined): OpenStatus {
  if (!hours) return { isOpen: false, label: 'Hours not listed', closingSoon: false };

  const now = new Date();

  // Derive current day and time in America/New_York.
  // Use hourCycle: 'h23' (not just hour12: false) — iOS Safari can ignore hour12 in some versions.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hourRaw = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const minuteRaw = parts.find((p) => p.type === 'minute')?.value ?? '0';

  const todayIndex = WEEKDAY_MAP[weekdayStr] ?? 0;
  const todayKey = DAY_KEYS[todayIndex];
  // Build HH:MM string; % 24 handles the rare 'h23' → '24' edge on some engines
  const currentTime = `${String(parseInt(hourRaw, 10) % 24).padStart(2, '0')}:${minuteRaw.padStart(2, '0')}`;

  const today = hours[todayKey];

  if (!today) return { isOpen: false, label: 'Closed today', closingSoon: false };

  // Use minute-based comparison so non-padded hours ("9:00" vs "09:00") in DB don't break string sort
  const currentMins = minutesFromTime(currentTime);
  const isOpen = currentMins >= minutesFromTime(today.open) && currentMins < minutesFromTime(today.close);

  if (isOpen) {
    const minsUntilClose = minutesFromTime(today.close) - currentMins;
    const closingSoon = minsUntilClose < 30;
    const label = closingSoon ? `Closes at ${formatTime(today.close)}` : 'Open now';
    return { isOpen: true, label, closingSoon };
  }

  if (currentMins < minutesFromTime(today.open)) {
    return { isOpen: false, label: `Opens at ${formatTime(today.open)}`, closingSoon: false };
  }

  return {
    isOpen: false,
    label: `Closed · Opens ${getNextOpenDay(hours, todayIndex)}`,
    closingSoon: false,
  };
}
