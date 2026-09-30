export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.length === 0 || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    partsFormatters.set(timeZone, formatter);
  }
  const parts: Record<string, string> = {};
  formatter.formatToParts(instant).forEach(part => {
    parts[part.type] = part.value;
  });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
  const wholeSecondMs = instantMs - (((instantMs % 1000) + 1000) % 1000);
  const parts = zonedParts(new Date(wholeSecondMs), timeZone);
  const wallClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallClockAsUtc - wholeSecondMs;
}

/** Converts a wall-clock time in an IANA time zone to the matching UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = timeZoneOffsetMs(wallClockAsUtc, timeZone);
  const firstGuess = wallClockAsUtc - firstOffset;
  const secondOffset = timeZoneOffsetMs(firstGuess, timeZone);
  return new Date(secondOffset === firstOffset ? firstGuess : wallClockAsUtc - secondOffset);
}

/** The instant for `hour`:00 local time on the calendar day before the game's local date. */
export function dayBeforeReminderAt(startsAt: Date, timeZone: string, hour = 19): Date {
  const local = zonedParts(startsAt, timeZone);
  const previousDay = new Date(Date.UTC(local.year, local.month - 1, local.day - 1));
  return zonedTimeToUtc(
    previousDay.getUTCFullYear(),
    previousDay.getUTCMonth() + 1,
    previousDay.getUTCDate(),
    hour,
    0,
    timeZone
  );
}

export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(instant);
}

export function formatDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(instant);
}

export function relativeDayLabel(instant: Date, timeZone: string, now: Date): string {
  const dayNumber = (parts: ZonedParts) => Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
  const difference = dayNumber(zonedParts(instant, timeZone)) - dayNumber(zonedParts(now, timeZone));
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  return formatDay(instant, timeZone);
}
