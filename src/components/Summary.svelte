<script>
  import { untrack } from 'svelte';
  import { CURRENCY_CODES } from '../lib/currencies.js';
  import { computeBalances, settle } from '../lib/settle.js';
  import { format } from '../lib/money.js';
  import { saveExpense, updateGroup } from '../lib/db.js';
  import { fetchRates, todayISO } from '../lib/rates.js';

  let { groupId, group, expenses, live, me } = $props();

  let base = $state(untrack(() => group.baseCurrency));

  let result = $derived(computeBalances(expenses, group.members, base, live));
  let transfers = $derived(settle(result.balances));
  let rows = $derived(Object.entries(result.balances).sort((a, b) => b[1] - a[1]));
  let max = $derived(Math.max(1, ...rows.map(([, v]) => Math.abs(v))));

  async function record(t) {
    if (!confirm(`Record that ${t.from} paid ${t.to} ${format(t.amount, base)}?`)) return;
    const { rates, date: rateDate } = await fetchRates(base).catch(() => ({ rates: { [base]: 1 }, date: null }));
    saveExpense(groupId, null, {
      kind: 'payment',
      title: 'Payment',
      amount: t.amount,
      currency: base,
      paidBy: t.from,
      split: { mode: 'custom', participants: [t.to], amounts: { [t.to]: t.amount } },
      rates,
      rateFixed: false,
      rateDate,
      date: todayISO(),
      createdBy: me,
    }).catch((err) => alert(`Saving failed: ${err.message}`));
  }
</script>

<section class="card">
  <div class="summary-head">
    <div>
      <div class="muted small">Group total</div>
      <div class="big-number">{format(result.totalSpent, base)}</div>
      {#if me in result.paid}
        <div class="my-stats muted small">
          <span>You paid <strong class="me">{format(result.paid[me], base)}</strong></span>
          <span>Your share <strong class="me">{format(result.share[me], base)}</strong></span>
        </div>
      {/if}
    </div>
    <label class="small">
      Show in
      <select bind:value={base}>
        {#each CURRENCY_CODES as c}<option value={c}>{c}</option>{/each}
      </select>
    </label>
  </div>
  {#if base !== group.baseCurrency}
    <button class="link small" onclick={() => updateGroup(groupId, { baseCurrency: base }).catch((err) => alert(err.message))}>
      Make {base} the group's main currency
    </button>
  {/if}
  {#if result.missing}
    <p class="warn-text small">{result.missing} expense(s) left out: no exchange rate available. Check your connection or set a rate on them.</p>
  {:else if result.usedLive}
    <p class="muted small">{result.usedLive} expense(s) converted at today's rate (no stored rate for {base}).</p>
  {/if}
</section>

<section class="card">
  <h2>Settle up</h2>
  {#if !transfers.length}
    <p class="muted">{expenses.length ? 'Everyone is settled up. 🎉' : 'Nothing to settle yet.'}</p>
  {:else}
    <p class="muted small">{transfers.length === 1 ? '1 payment settles' : `${transfers.length} payments settle`} everything:</p>
    <ul class="list">
      {#each transfers as t (`${t.from}>${t.to}`)}
        <li class="transfer">
          <span class="grow">
            <strong class:me={t.from === me}>{t.from}</strong>
            <span class="muted">pays</span>
            <strong class:me={t.to === me}>{t.to}</strong>
          </span>
          <span class="amount">{format(t.amount, base)}</span>
          <button class="btn secondary small" onclick={() => record(t)}>Paid</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="card">
  <h2>Balances</h2>
  <ul class="balances">
    {#each rows as [name, v] (name)}
      <li>
        <span class="name" class:me={name === me}>{name}</span>
        <span class="bar-track">
          <span class="bar" class:pos={v > 0} class:neg={v < 0} style:width={`${(Math.abs(v) / max) * 50}%`}></span>
        </span>
        <span class="amount" class:pos-text={v > 0} class:neg-text={v < 0}>
          {v > 0 ? '+' : ''}{format(v, base)}
        </span>
      </li>
    {/each}
  </ul>
  <p class="muted small">Positive = gets money back, negative = owes.</p>
</section>
