export const SYSTEM_TIME_ZONE = "Asia/Manila";

function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SYSTEM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function todaySystemDate() {
  const parts = manilaParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function currentSystemTime() {
  const parts = manilaParts();
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

export function currentSystemDateTime() {
  return `${todaySystemDate()} ${currentSystemTime().slice(0, 5)}`;
}

export function currentPayrollPeriodLabel() {
  const today = todaySystemDate();
  const [year, month, day] = today.split("-").map(Number);
  const startDay = day <= 15 ? 1 : 16;
  const endDay = day <= 15 ? 15 : lastDayOfMonth(year, month);
  const monthName = new Date(`${today}T00:00:00`).toLocaleDateString("en-US", {
    timeZone: SYSTEM_TIME_ZONE,
    month: "long",
  });

  return `${monthName} ${startDay}-${endDay}, ${year}`;
}

export function formatSystemDate(value: string | Date = new Date(), options: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    timeZone: SYSTEM_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatSystemDateTime(value: string | Date = new Date(), options: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
    timeZone: SYSTEM_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}

export function formatDatabaseDateTime(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "";
  const date = typeof value === "string" ? parseDatabaseTimestamp(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return formatSystemDateTime(date, options);
}

export function databaseDateKey(value: string | Date | null | undefined) {
  if (!value) return todaySystemDate();
  const date = typeof value === "string" ? parseDatabaseTimestamp(value) : value;
  if (Number.isNaN(date.getTime())) return todaySystemDate();
  const parts = manilaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysSystemDate(value: string, days: number) {
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return todaySystemDate();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateOnly(value);
  return new Date(value);
}

export function parseDatabaseTimestamp(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateOnly(value);
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized);
  if (hasTimeZone) return new Date(normalized);

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/);
  if (!match) return new Date(normalized);

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 8,
    Number(minute),
    Number(second),
  ));
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
