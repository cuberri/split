// All amounts are stored as integers in minor units (cents/Rappen)
// to avoid floating-point rounding errors.
import { decimals } from './currencies.js';

/** Parse user input like "12.50", "12,5" or "1'234.50" into minor units. NaN if invalid. */
export function toMinor(text, code) {
  const s = String(text ?? '').trim().replace(/[\s']/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s) && !/^\.\d+$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 10 ** decimals(code));
}

/** Minor units -> plain decimal string for an input field, e.g. 1250 -> "12.50". */
export function fromMinor(minor, code) {
  const d = decimals(code);
  return (minor / 10 ** d).toFixed(d);
}

const formatters = new Map();
export function format(minor, code) {
  if (!formatters.has(code)) {
    formatters.set(code, new Intl.NumberFormat(undefined, { style: 'currency', currency: code }));
  }
  return formatters.get(code).format(minor / 10 ** decimals(code));
}

/** Convert minor units of `from` into minor units of `to` using `rate` (1 from = rate to). */
export function convertMinor(minor, from, to, rate) {
  return Math.round(minor * rate * 10 ** (decimals(to) - decimals(from)));
}

/**
 * Split an integer `total` proportionally to `weights` so that the parts are
 * integers and sum exactly to `total` (largest-remainder method).
 */
export function allocate(total, weights) {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sumW);
  const parts = raw.map(Math.floor);
  const rem = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => [r - parts[i], i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < rem; k++) parts[order[k % order.length][1]]++;
  return parts;
}
