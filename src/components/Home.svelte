<script>
  import { CURRENCIES, CURRENCY_CODES } from '../lib/currencies.js';
  import { createGroup, cleanName } from '../lib/db.js';
  import { recentGroups, rememberGroup, forgetGroup, setMe } from '../lib/storage.js';
  import { goto } from '../lib/router.svelte.js';
  import { LOCAL_MODE } from '../lib/firebase.js';

  let name = $state('');
  let myName = $state('');
  let others = $state('');
  let base = $state(CURRENCY_CODES[0]);
  let busy = $state(false);
  let error = $state('');
  let recent = $state(recentGroups());

  async function submit(e) {
    e.preventDefault();
    error = '';
    const me = cleanName(myName);
    const groupName = name.trim().slice(0, 80);
    if (!groupName || !me) {
      error = 'Please enter a group name and your name.';
      return;
    }
    const members = [...new Set([me, ...others.split(',').map(cleanName)].filter(Boolean))];
    busy = true;
    try {
      const id = await createGroup({ name: groupName, baseCurrency: base, members });
      setMe(id, me);
      rememberGroup(id, groupName);
      goto(id);
    } catch (err) {
      error = `Could not create the group: ${err.message}`;
    } finally {
      busy = false;
    }
  }

  function forget(id) {
    forgetGroup(id);
    recent = recentGroups();
  }
</script>

<header class="hero">
  <h1>Split</h1>
  <p class="muted">{LOCAL_MODE ? 'Split costs with friends. No sign-up.' : 'Share costs with friends. No sign-up — just share the link.'}</p>
</header>

{#if recent.length}
  <section class="card">
    <h2>Your groups</h2>
    <ul class="list">
      {#each recent as g (g.id)}
        <li class="row-wrap">
          <a class="row" href={`#/g/${g.id}`}><span class="grow">{g.name}</span><span aria-hidden="true">›</span></a>
          <button class="icon" title="Remove from this list" aria-label={`Remove ${g.name} from this list`} onclick={() => forget(g.id)}>×</button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<form class="card" onsubmit={submit}>
  <h2>New group</h2>
  <label>
    Group name
    <input bind:value={name} placeholder="Ski weekend Verbier" maxlength="80" required />
  </label>
  <label>
    Your name
    <input bind:value={myName} placeholder="Alex" maxlength="40" autocomplete="given-name" required />
  </label>
  <label>
    Other people <span class="muted small">(optional, comma-separated — they can also join later)</span>
    <input bind:value={others} placeholder="Sam, Robin, Kim" />
  </label>
  <label>
    Main currency
    <select bind:value={base}>
      {#each CURRENCY_CODES as c}<option value={c}>{c} — {CURRENCIES[c].name}</option>{/each}
    </select>
  </label>
  {#if error}<p class="error-text">{error}</p>{/if}
  <button class="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</button>
</form>

<p class="muted small center">
  {#if LOCAL_MODE}
    Groups are saved in this browser on this computer. Clearing your browser data deletes them.
  {:else}
    Anyone with a group's link can view and edit it, so only share it with the people in the group.
  {/if}
</p>
