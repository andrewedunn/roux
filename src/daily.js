// ABOUTME: The daily menu calendar: dates in Louisiana (Central) time, numbered menus since launch, and streaks.
// ABOUTME: Everyone gets the same menu on the same Central-time day.

export const LAUNCH_DATE = '2026-09-23';
const ZONE = 'America/Chicago';
const DAY_MS = 24 * 60 * 60 * 1000;

export function centralDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const utcDay = (isoDate) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function dailyNumber(date = new Date()) {
  return Math.round((utcDay(centralDate(date)) - utcDay(LAUNCH_DATE)) / DAY_MS) + 1;
}

export function dailySeed(number) {
  let h = Math.imul(number ^ 0x5f3759df, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

// records: { [dailyNumber]: { playedOn: dailyNumber, ... } }. Only menus played on their own day count.
export function streak(records, today) {
  const onTime = (n) => records[n] && records[n].playedOn === n;
  let n = onTime(today) ? today : today - 1;
  let count = 0;
  while (onTime(n)) {
    count += 1;
    n -= 1;
  }
  return count;
}
