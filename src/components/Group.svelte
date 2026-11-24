<script>
  import { onMount, untrack } from 'svelte';
  import { subscribeGroup, subscribeExpenses, addMember, cleanName } from '../lib/db.js';
  import { getMe, setMe, rememberGroup } from '../lib/storage.js';
  import { fetchLiveRates } from '../lib/rates.js';
  import { LOCAL_MODE } from '../lib/firebase.js';
  import JoinPrompt from './JoinPrompt.svelte';
  import ExpenseList from './ExpenseList.svelte';
  import ExpenseForm from './ExpenseForm.svelte';
  import Summary from './Summary.svelte';

  let { id } = $props();

  let group = $state(null);
  let expenses = $state([]);
  let status = $state('loading'); // loading | ready | missing | error
  let errorMsg = $state('');
  let me = $state(untrack(() => getMe(id))); // component is re-created per group (keyed)
  let tab = $state('expenses');
  let editing = $state(null); // null | 'new' | expense
  let live = $state(null);
  let copied = $state(false);
  let addingPerson = $state(false);
  let newPerson = $state('');

  $effect(() => {
    const fail = (err) => {
      status = 'error';
      errorMsg = err.message;
    };
    const stopGroup = subscribeGroup(
      id,
      (g) => {
        if (!g) {
          status = 'missing';
          return;
        }
        group = g;
        status = 'ready';
        rememberGroup(id, g.name);
      },
      fail,
    );
    const stopExpenses = subscribeExpenses(id, (list) => (expenses = list), fail);
    return () => {
      stopGroup();
      stopExpenses();
    };
  });

  onMount(() => {
    fetchLiveRates().then((r) => (live = r), () => {});
  });

  // If this device remembers a name that isn't in the group (yet), add it.
  $effect(() => {
    if (group && me && !group.members.includes(me)) addMember(id, me).catch(() => {});
  });

  function join(name) {
    if (!group.members.includes(name)) addMember(id, name).catch((err) => alert(err.message));
    setMe(id, name);
    me = name;
  }

  function addPerson(e) {
    e.preventDefault();
    const n = cleanName(newPerson);
    if (n && !group.members.includes(n)) addMember(id, n).catch((err) => alert(err.message));
    newPerson = '';
    addingPerson = false;
  }

  async function share() {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text: `Add your expenses for “${group.name}”`, url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  }
</script>

{#if status === 'loading'}
  <p class="muted center pad">Loading group…</p>
{:else if status === 'missing'}
  <section class="card">
    <h2>Group not found</h2>
    <p class="muted">{LOCAL_MODE ? 'Local groups only exist in the browser they were created in.' : 'Check that you have the complete link.'}</p>
    <a class="btn secondary" href="#/">Go home</a>
  </section>
{:else if status === 'error'}
  <section class="card warn">
    <h2>Couldn't load this group</h2>
    <p>{errorMsg}</p>
  </section>
{:else if !me}
  <JoinPrompt groupName={group.name} members={group.members} onjoin={join} />
{:else}
  <header class="group-head">
    <a href="#/" class="icon" aria-label="All groups">‹</a>
    <div class="grow">
      <h1>{group.name}</h1>
      <p class="muted small">You're <strong>{me}</strong> · <button class="link" onclick={() => (me = null)}>not you?</button></p>
    </div>
    {#if !LOCAL_MODE}
      <button class="btn secondary" onclick={share}>{copied ? 'Copied!' : 'Share link'}</button>
    {/if}
  </header>

  <div class="chips people">
    {#each group.members as m}<span class="chip" class:me={m === me}>{m}</span>{/each}
    {#if addingPerson}
      <form class="inline" onsubmit={addPerson}>
        <!-- svelte-ignore a11y_autofocus -->
        <input bind:value={newPerson} placeholder="Name" maxlength="40" autofocus />
        <button class="btn primary small">Add</button>
      </form>
    {:else}
      <button class="chip add" onclick={() => (addingPerson = true)}>+ person</button>
    {/if}
  </div>

  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === 'expenses'} class:active={tab === 'expenses'} onclick={() => (tab = 'expenses')}>
      Expenses <span class="count">{expenses.length}</span>
    </button>
    <button role="tab" aria-selected={tab === 'balances'} class:active={tab === 'balances'} onclick={() => (tab = 'balances')}>
      Balances
    </button>
  </div>

  {#if tab === 'expenses'}
    <ExpenseList {expenses} base={group.baseCurrency} {live} onedit={(e) => (editing = e)} />
  {:else}
    <Summary groupId={id} {group} {expenses} {live} {me} />
  {/if}

  <div class="fab-space"></div>
  <button class="fab" onclick={() => (editing = 'new')}>+ Add expense</button>

  {#if editing}
    <ExpenseForm
      groupId={id}
      {group}
      {me}
      expense={editing === 'new' ? null : editing}
      onclose={() => (editing = null)}
    />
  {/if}
{/if}
