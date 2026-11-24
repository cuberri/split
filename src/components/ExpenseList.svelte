<script>
  import { format, convertMinor } from '../lib/money.js';
  import { rateFor, splitParts } from '../lib/settle.js';

  let { expenses, base, live, onedit } = $props();

  const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  const fmtDate = (iso) => dateFmt.format(new Date(`${iso}T12:00:00`));

  function forLabel(e) {
    const { people } = splitParts(e);
    if (e.kind === 'payment') return '';
    if (people.length === 1) return `for ${people[0]}`;
    return `${people.length} people${e.split.mode === 'custom' ? ' · custom' : ''}`;
  }
</script>

{#if !expenses.length}
  <div class="empty">
    <p>No expenses yet.</p>
    <p class="muted small">Tap “Add expense” to add the first one.</p>
  </div>
{:else}
  <ul class="list card flush">
    {#each expenses as e (e.id)}
      <li>
        <button class="row" onclick={() => onedit(e)}>
          <span class="badge" class:payment={e.kind === 'payment'} aria-hidden="true">{e.kind === 'payment' ? '⇄' : e.title.slice(0, 1).toUpperCase()}</span>
          <span class="grow">
            <span class="title">{e.kind === 'payment' ? `${e.paidBy} paid ${splitParts(e).people[0]}` : e.title}</span>
            <span class="muted small">
              {fmtDate(e.date)} · {e.kind === 'payment' ? 'settlement' : `${e.paidBy} paid`}{forLabel(e) ? ` · ${forLabel(e)}` : ''}
            </span>
          </span>
          <span class="amount">
            <span>{format(e.amount, e.currency)}</span>
            {#if e.currency !== base}
              {@const r = rateFor(e, base, live)}
              {#if r}<span class="muted small">≈ {format(convertMinor(e.amount, e.currency, base, r.value), base)}</span>{/if}
            {/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
{/if}
