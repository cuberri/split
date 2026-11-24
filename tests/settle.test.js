import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settle, computeBalances } from '../src/lib/settle.js';
import { allocate, toMinor } from '../src/lib/money.js';

const applies = (balances, transfers) => {
  const b = { ...balances };
  for (const t of transfers) {
    b[t.from] += t.amount;
    b[t.to] -= t.amount;
  }
  return Object.values(b).every((v) => v === 0);
};

test('allocate sums exactly', () => {
  assert.deepEqual(allocate(1000, [1, 1, 1]), [334, 333, 333]);
  assert.deepEqual(allocate(1001, [2, 1]), [667, 334]);
});

test('toMinor parses common formats', () => {
  assert.equal(toMinor('12,5', 'EUR'), 1250);
  assert.equal(toMinor("1'234.50", 'CHF'), 123450);
  assert.ok(Number.isNaN(toMinor('abc', 'EUR')));
});

test('settle finds zero-sum subgroups (fewer than greedy)', () => {
  // A+B and C+D cancel out pairwise: optimal is 2 payments, not 3.
  const balances = { A: 500, B: -500, C: 700, D: -700 };
  const t = settle(balances);
  assert.equal(t.length, 2);
  assert.ok(applies(balances, t));
});

test('settle uses at most n-1 payments per zero-sum group', () => {
  const balances = { A: 600, B: 400, C: -300, D: -700 };
  const t = settle(balances);
  assert.equal(t.length, 3);
  assert.ok(applies(balances, t));
  const b2 = { A: 3, B: 4, C: -5, D: -2, E: 6, F: -6 };
  const t2 = settle(b2);
  assert.equal(t2.length, 4); // {E,F} + {A,B,C,D}
  assert.ok(applies(b2, t2));
});

test('computeBalances with currency conversion and custom split', () => {
  const expenses = [
    { amount: 3000, currency: 'EUR', paidBy: 'A', split: { mode: 'equal', participants: ['A', 'B', 'C'] }, rates: { EUR: 1, CHF: 0.9 } },
    { amount: 1000, currency: 'CHF', paidBy: 'B', split: { mode: 'custom', participants: ['A', 'C'], amounts: { A: 700, C: 300 } }, rates: { CHF: 1, EUR: 1.1 } },
  ];
  const { balances, totalSpent, paid, share } = computeBalances(expenses, ['A', 'B', 'C'], 'EUR', null);
  assert.deepEqual(balances, { A: 2000 - 770, B: -1000 + 1100, C: -1000 - 330 });
  assert.equal(totalSpent, 4100);
  assert.deepEqual(paid, { A: 3000, B: 1100, C: 0 });
  assert.deepEqual(share, { A: 1000 + 770, B: 1000, C: 1000 + 330 });
  assert.equal(Object.values(balances).reduce((a, b) => a + b), 0);
});

test('payments change balances but not paid or share', () => {
  const expenses = [
    { amount: 1000, currency: 'EUR', paidBy: 'A', split: { mode: 'equal', participants: ['A', 'B'] }, rates: {} },
    { kind: 'payment', amount: 500, currency: 'EUR', paidBy: 'B', split: { mode: 'custom', participants: ['A'], amounts: { A: 500 } }, rates: {} },
  ];
  const r = computeBalances(expenses, ['A', 'B'], 'EUR', null);
  assert.deepEqual(r.balances, { A: 0, B: 0 });
  assert.deepEqual(r.paid, { A: 1000, B: 0 });
  assert.deepEqual(r.share, { A: 500, B: 500 });
  assert.equal(r.totalSpent, 1000);
});
