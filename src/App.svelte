<script>
  import { route } from './lib/router.svelte.js';
  import { LOCAL_MODE } from './lib/firebase.js';
  import { version } from './lib/version.js';
  import Home from './components/Home.svelte';
  import Group from './components/Group.svelte';

  const builtAt = new Date(version.builtAt).toLocaleString();
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

<footer class="app-footer" class:with-fab={route.groupId}>
  <span title={`Built ${builtAt}`}>
    Split ·
    {#if version.commitUrl}
      <a href={version.commitUrl} target="_blank" rel="noopener">{version.label}</a>
    {:else}
      {version.label}
    {/if}
  </span>
</footer>
