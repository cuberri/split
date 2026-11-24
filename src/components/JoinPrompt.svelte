<script>
  import { cleanName } from '../lib/db.js';

  let { groupName, members, onjoin } = $props();
  let newName = $state('');

  function submit(e) {
    e.preventDefault();
    const n = cleanName(newName);
    if (n) onjoin(n);
  }
</script>

<section class="card">
  <h1>{groupName}</h1>
  <p class="muted">Who are you? This is remembered on this device.</p>
  {#if members.length}
    <div class="chips">
      {#each members as m}
        <button class="chip big" onclick={() => onjoin(m)}>{m}</button>
      {/each}
    </div>
    <p class="muted small">Not in the list?</p>
  {/if}
  <form class="inline" onsubmit={submit}>
    <input bind:value={newName} placeholder="Your name" maxlength="40" autocomplete="given-name" />
    <button class="btn primary" disabled={!newName.trim()}>Join</button>
  </form>
</section>
