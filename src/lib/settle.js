// Balance calculation and "fewest payments" settlement. Pure functions, no DOM.
import { allocate, convertMinor } from './money.js';

/**
 * Rate to convert expense `e` into `to`. Prefers the rate stored on the
 * expense (fetched for its date, or fixed by the group); falls back to live
 * EUR-based rates. Returns { value, live } or null if unknown.
 */
export function rateFor(e, to, live) {
  if (e.currency === to) return { value: 1, live: false };
  const stored = e.rates?.[to];
  if (stored > 0) return { value: stored, live: false };
  if (live?.[e.currency] && live?.[to]) return { value: live[to] / live[e.currency], live: true };
  return null;
}

/** Who is in an expense and with what weight. */
export function splitParts(e) {
  if (e.split?.mode === 'custom') {
    const people = Object.keys(e.split.amounts ?? {}).filter((p) => e.split.amounts[p] > 0);
    return { people, weights: people.map((p) => e.split.amounts[p]) };
  }
  const people = e.split?.participants ?? [];
  return { people, weights: people.map(() => 1) };
}

/**
 * Net balance per person in `base` minor units.
 * Positive = should receive money, negative = owes money. Always sums to 0.
 */
export function computeBalances(expenses, members, base, live) {
  const balances = Object.fromEntries(members.map((m) => [m, 0]));
  const paid = Object.fromEntries(members.map((m) => [m, 0]));
  let totalSpent = 0;
  let missing = 0;
  let usedLive = 0;

  for (const e of expenses) {
    const { people, weights } = splitParts(e);
    if (!people.length || !(e.amount > 0)) continue;
    const rate = rateFor(e, base, live);
    if (!rate) {
      missing++;
      continue;
    }
    if (rate.live) usedLive++;
    const total = convertMinor(e.amount, e.currency, base, rate.value);
    const shares = allocate(total, weights);
    balances[e.paidBy] = (balances[e.paidBy] ?? 0) + total;
    people.forEach((p, i) => (balances[p] = (balances[p] ?? 0) - shares[i]));
    if (e.kind !== 'payment') {
      totalSpent += total;
      paid[e.paidBy] = (paid[e.paidBy] ?? 0) + total;
    }
  }
  return { balances, paid, totalSpent, missing, usedLive };
}

/**
 * Minimal list of transfers { from, to, amount } that settles all balances.
 *
 * The minimum number of payments equals (people with a non-zero balance) minus
 * (the maximum number of disjoint groups whose balances sum to zero). We find
 * that partition exactly with a bitmask DP for up to 14 people with open
 * balances, then settle each group greedily (n-1 payments per group).
 * Larger groups fall back to greedy, which is never worse than n-1 payments.
 */
export function settle(balances) {
  const people = Object.entries(balances).filter(([, v]) => v !== 0);
  if (people.length < 2) return [];
  const groups = people.length <= 14 ? zeroSumGroups(people) : [people];
  return groups.flatMap(greedy);
}

function greedy(group) {
  const debtors = group.filter(([, v]) => v < 0).map(([n, v]) => ({ n, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = group.filter(([, v]) => v > 0).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    if (amount > 0) out.push({ from: debtors[i].n, to: creditors[j].n, amount });
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

function zeroSumGroups(people) {
  const n = people.length;
  const size = 1 << n;
  const full = size - 1;
  const sum = new Float64Array(size);
  const dp = new Int8Array(size);

  for (let mask = 1; mask < size; mask++) {
    const low = mask & -mask;
    sum[mask] = sum[mask ^ low] + people[31 - Math.clz32(low)][1];
  }
  // dp[mask] = max number of disjoint zero-sum groups formed by the people in mask
  for (let mask = 1; mask < size; mask++) {
    let best = 0;
    for (let m = mask; m; m &= m - 1) {
      const v = dp[mask ^ (m & -m)];
      if (v > best) best = v;
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0);
  }

  // Peel off one minimal zero-sum group at a time.
  const groups = [];
  let mask = full;
  while (mask) {
    const low = mask & -mask;
    const rest = mask ^ low;
    let found = mask;
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const s = sub | low;
      if (s !== mask && sum[s] === 0 && dp[mask ^ s] === dp[mask] - 1) {
        found = s;
        break;
      }
      if (sub === 0) break;
    }
    const g = [];
    for (let i = 0; i < n; i++) if (found & (1 << i)) g.push(people[i]);
    groups.push(g);
    mask ^= found;
  }
  return groups;
}
