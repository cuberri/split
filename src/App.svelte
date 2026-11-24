<script>
  import { route } from './lib/router.svelte.js';
  import { LOCAL_MODE } from './lib/firebase.js';
  import Home from './components/Home.svelte';
  import Group from './components/Group.svelte';
</script>

{#if LOCAL_MODE}
  <div class="local-banner">Local mode: saved in this browser only, not shared.</div>
{/if}

<main class="container">
  {#if route.groupId}
    {#key route.groupId}
      <Group id={route.groupId} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>
