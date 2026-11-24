// Exchange rates from Frankfurter (free, no API key, ECB reference rates).
// https://frankfurter.dev
import { CURRENCY_CODES } from './currencies.js';

const API = 'https://api.frankfurter.dev/v1';
const cache = new Map();

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Rates from `from` to every supported currency on `date` (or the latest).
 * Returns { date, rates: { EUR: 1, CHF: 0.93, ... } } meaning 1 `from` = rate.
 * Weekends/holidays resolve to the previous business day.
 */
export function fetchRates(from, date) {
  const d = !date || date >= todayISO() ? 'latest' : date;
  const key = `${from}:${d}`;
  if (!cache.has(key)) {
    cache.set(key, load(from, d).catch((err) => {
      cache.delete(key);
      throw err;
    }));
  }
  return cache.get(key);
}

async function load(from, d) {
  const symbols = CURRENCY_CODES.filter((c) => c !== from);
  if (!symbols.length) return { date: d, rates: { [from]: 1 } };
  const res = await fetch(`${API}/${d}?base=${from}&symbols=${symbols.join(',')}`);
  if (!res.ok) throw new Error(`Exchange rate lookup failed (${res.status})`);
  const json = await res.json();
  return { date: json.date, rates: { ...json.rates, [from]: 1 } };
}

/**
 * Latest rates relative to EUR (EUR = 1). Used as a fallback for expenses
 * that have no stored rate for the currency being viewed.
 */
export async function fetchLiveRates() {
  return (await fetchRates('EUR')).rates;
}
