<script>
  import { untrack } from 'svelte';
  import { CURRENCIES, CURRENCY_CODES } from '../lib/currencies.js';
  import { toMinor, fromMinor, format, allocate } from '../lib/money.js';
  import { fetchRates, todayISO } from '../lib/rates.js';
  import { saveExpense, deleteExpense } from '../lib/db.js';

  let { groupId, group, me, expense = null, onclose } = $props();

  // Snapshot the inputs once: the form edits a copy, not the live data.
  const init = untrack(() => ({ expense, group, me }));
  const e = init.expense;
  const base = init.group.baseCurrency;
  const members = [...new Set([...init.group.members, ...(e ? Object.keys(e.split.amounts ?? {}) : []), ...(e?.split.participants ?? [])])];
  const isPayment = e?.kind === 'payment';

  let title = $state(e?.title ?? '');
  let amountText = $state(e ? fromMinor(e.amount, e.currency) : '');
  let currency = $state(e?.currency ?? base);
  let date = $state(e?.date ?? todayISO());
  let paidBy = $state(e?.paidBy ?? init.me);
  let mode = $state(e?.split.mode ?? 'equal');
  let included = $state(Object.fromEntries(members.map((m) => [m, e ? (e.split.participants ?? []).includes(m) : true])));
  let customText = $state(
    Object.fromEntries(
      members.map((m) => [m, e?.split.mode === 'custom' && e.split.amounts?.[m] ? fromMinor(e.split.amounts[m], e.currency) : '']),
    ),
  );
  let fixRate = $state(e?.rateFixed ?? false);
  let fixedRateText = $state(e?.rateFixed && e.rates?.[base] ? String(e.rates[base]) : '');
  let fetched = $state(null);
  let rateStatus = $state('idle'); // idle | loading | ok | error
  let error = $state('');

  // Look up the rate for the chosen currency and date.
  $effect(() => {
    const cur = currency;
    const d = date;
    let cancelled = false;
    rateStatus = 'loading';
    fetchRates(cur, d).then(
      (r) => {
        if (cancelled) return;
        fetched = r;
        rateStatus = 'ok';
      },
      () => {
        if (cancelled) return;
        fetched = null;
        rateStatus = 'error';
      },
    );
    return () => (cancelled = true);
  });

  let amount = $derived(toMinor(amountText, currency));
  let participants = $derived(members.filter((m) => included[m]));
  let customMinor = $derived(Object.fromEntries(members.map((m) => [m, customText[m]?.trim() ? toMinor(customText[m], currency) : 0])));
  let customSum = $derived(members.reduce((s, m) => s + (Number.isNaN(customMinor[m]) ? 0 : customMinor[m]), 0));
  let equalShares = $derived(amount > 0 && participants.length ? allocate(amount, participants.map(() => 1)) : []);
  let autoRate = $derived(fetched?.rates?.[base]);

  function toggleFix() {
    fixRate = !fixRate;
    if (fixRate && !fixedRateText && autoRate) fixedRateText = String(autoRate);
  }

  function splitEvenly() {
    const chosen = members.filter((m) => customMinor[m] > 0);
    const people = chosen.length ? chosen : members;
    if (!(amount > 0)) return;
    const parts = allocate(amount, people.map(() => 1));
    for (const m of members) customText[m] = '';
    people.forEach((m, i) => (customText[m] = fromMinor(parts[i], currency)));
  }

  function save(ev) {
    ev.preventDefault();
    error = '';
    if (!isPayment && !title.trim()) return (error = 'Add a short description.');
    if (!(amount > 0)) return (error = 'Enter a valid amount.');
    if (!paidBy) return (error = 'Who paid?');

    let split;
    if (mode === 'equal') {
      if (!participants.length) return (error = 'Pick at least one person to split between.');
      split = { mode: 'equal', participants };
    } else {
      if (members.some((m) => Number.isNaN(customMinor[m]))) return (error = 'One of the custom amounts is not a valid number.');
      const amounts = Object.fromEntries(members.filter((m) => customMinor[m] > 0).map((m) => [m, customMinor[m]]));
      if (customSum !== amount) {
        return (error = `Custom amounts add up to ${format(customSum, currency)}, but the total is ${format(amount, currency)}.`);
      }
      split = { mode: 'custom', participants: Object.keys(amounts), amounts };
    }

    // Rates: 1 <currency> = rates[X] X. Keep the old ones if the lookup failed and nothing changed.
    const sameAsBefore = e && e.currency === currency && e.date === date;
    let rates = { ...(fetched?.rates ?? (sameAsBefore ? e.rates : {})), [currency]: 1 };
    let rateDate = fetched?.date ?? (sameAsBefore ? e.rateDate : null) ?? null;
    const useFixed = fixRate && currency !== base;
    if (useFixed) {
      const r = parseFloat(String(fixedRateText).replace(',', '.'));
      if (!(r > 0)) return (error = 'Enter a valid exchange rate.');
      const old = rates[base];
      // Keep cross rates to other currencies consistent with the fixed rate.
      for (const c of Object.keys(rates)) {
        if (c === currency || c === base) continue;
        if (old) rates[c] = (rates[c] * r) / old;
        else delete rates[c];
      }
      rates[base] = r;
      rateDate = null;
    }

    const data = {
      kind: e?.kind ?? 'expense',
      title: isPayment ? 'Payment' : title.trim().slice(0, 100),
      amount,
      currency,
      paidBy,
      split,
      rates,
      rateFixed: useFixed,
      rateDate,
      date,
      createdBy: e?.createdBy ?? init.me,
    };
    saveExpense(groupId, e?.id ?? null, data, e?.createdAt).catch((err) => alert(`Saving failed: ${err.message}`));
    onclose();
  }

  function remove() {
    if (!confirm(`Delete “${e.title}”? This can't be undone.`)) return;
    deleteExpense(groupId, e.id).catch((err) => alert(`Delete failed: ${err.message}`));
    onclose();
  }

  function onkeydown(ev) {
    if (ev.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="overlay" role="presentation" onclick={(ev) => ev.target === ev.currentTarget && onclose()}>
  <form class="sheet" onsubmit={save} aria-label={e ? 'Edit expense' : 'Add expense'}>
    <header class="sheet-head">
      <h2>{isPayment ? 'Payment' : e ? 'Edit expense' : 'Add expense'}</h2>
      <button type="button" class="icon" aria-label="Close" onclick={onclose}>×</button>
    </header>

    {#if !isPayment}
      <label>
        What for?
        <input bind:value={title} placeholder="Dinner, groceries, fuel…" maxlength="100" />
      </label>
    {/if}

    <div class="grid-2">
      <label class="amount-field">
        Amount
        <span class="joined">
          <input bind:value={amountText} inputmode="decimal" placeholder="0.00" autocomplete="off" />
          <select bind:value={currency} aria-label="Currency">
            {#each CURRENCY_CODES as c}<option value={c}>{c}</option>{/each}
          </select>
        </span>
      </label>
      <label>
        Date
        <input type="date" bind:value={date} max={todayISO()} />
      </label>
    </div>

    {#if currency !== base}
      <div class="rate-box">
        {#if fixRate}
          <label class="inline-label">
            1 {currency} =
            <input class="rate-input" bind:value={fixedRateText} inputmode="decimal" aria-label={`Rate ${currency} to ${base}`} />
            {base}
          </label>
        {:else if rateStatus === 'loading'}
          <span class="muted small">Looking up {currency} → {base} rate…</span>
        {:else if rateStatus === 'ok' && autoRate}
          <span class="small">1 {currency} = {autoRate} {base} <span class="muted">(ECB, {fetched.date})</span></span>
        {:else}
          <span class="small warn-text">Couldn't load the exchange rate. Today's rate will be used until you set one.</span>
        {/if}
        <label class="check small">
          <input type="checkbox" checked={fixRate} onchange={toggleFix} /> Use our own rate
        </label>
        {#if amount > 0 && (fixRate ? parseFloat(String(fixedRateText).replace(',', '.')) > 0 : autoRate)}
          <span class="muted small">
            ≈ {format(Math.round(amount * (fixRate ? parseFloat(String(fixedRateText).replace(',', '.')) : autoRate) * 10 ** (CURRENCIES[base].decimals - CURRENCIES[currency].decimals)), base)}
          </span>
        {/if}
      </div>
    {/if}

    <label>
      Paid by
      <select bind:value={paidBy}>
        {#each members as m}<option value={m}>{m}{m === init.me ? ' (you)' : ''}</option>{/each}
      </select>
    </label>

    <fieldset>
      <legend>{isPayment ? 'Paid to' : 'Split'}</legend>
      {#if !isPayment}
        <div class="segmented" role="radiogroup">
          <button type="button" role="radio" aria-checked={mode === 'equal'} class:active={mode === 'equal'} onclick={() => (mode = 'equal')}>Equally</button>
          <button type="button" role="radio" aria-checked={mode === 'custom'} class:active={mode === 'custom'} onclick={() => (mode = 'custom')}>Custom amounts</button>
        </div>
      {/if}

      {#if mode === 'equal'}
        <ul class="split-list">
          {#each members as m}
            {@const idx = participants.indexOf(m)}
            <li>
              <label class="check">
                <input type="checkbox" bind:checked={included[m]} />
                <span class="grow">{m}</span>
                <span class="muted small">{idx >= 0 && equalShares[idx] != null ? format(equalShares[idx], currency) : ''}</span>
              </label>
            </li>
          {/each}
        </ul>
        <div class="row-actions">
          <button type="button" class="link small" onclick={() => members.forEach((m) => (included[m] = true))}>All</button>
          <button type="button" class="link small" onclick={() => members.forEach((m) => (included[m] = false))}>None</button>
        </div>
      {:else}
        <ul class="split-list">
          {#each members as m}
            <li>
              <label class="custom-row">
                <span class="grow">{m}</span>
                <input bind:value={customText[m]} inputmode="decimal" placeholder="0.00" aria-label={`Amount for ${m}`} />
              </label>
            </li>
          {/each}
        </ul>
        <div class="row-actions">
          <span class="small" class:warn-text={amount > 0 && customSum !== amount}>
            {format(customSum, currency)} of {amount > 0 ? format(amount, currency) : '—'}
            {#if amount > 0 && customSum !== amount}
              · {customSum < amount ? `${format(amount - customSum, currency)} left` : `${format(customSum - amount, currency)} too much`}
            {/if}
          </span>
          {#if !isPayment}<button type="button" class="link small" onclick={splitEvenly}>Even out</button>{/if}
        </div>
      {/if}
    </fieldset>

    {#if error}<p class="error-text">{error}</p>{/if}

    <div class="sheet-actions">
      {#if e}<button type="button" class="btn danger" onclick={remove}>Delete</button>{/if}
      <span class="grow"></span>
      <button type="button" class="btn secondary" onclick={onclose}>Cancel</button>
      <button class="btn primary">Save</button>
    </div>
  </form>
</div>
