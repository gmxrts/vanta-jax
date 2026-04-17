export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function getNextOpenDay(hours: HoursMap, now: Date): string {
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (now.getDay() + i) % 7;
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
  const todayKey = DAY_KEYS[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  const today = hours[todayKey];

  if (!today) return { isOpen: false, label: 'Closed today', closingSoon: false };

  const isOpen = currentTime >= today.open && currentTime < today.close;

  if (isOpen) {
    const minsUntilClose = minutesFromTime(today.close) - minutesFromTime(currentTime);
    const closingSoon = minsUntilClose < 30;
    const label = closingSoon ? `Closes at ${formatTime(today.close)}` : 'Open now';
    return { isOpen: true, label, closingSoon };
  }

  if (currentTime < today.open) {
    return { isOpen: false, label: `Opens at ${formatTime(today.open)}`, closingSoon: false };
  }

  return {
    isOpen: false,
    label: `Closed · Opens ${getNextOpenDay(hours, now)}`,
    closingSoon: false,
  };
}
