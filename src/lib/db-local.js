// Local mode: everything is saved in this browser's localStorage.
// Nothing leaves the computer. Other tabs of the same browser stay in sync
// via the "storage" event. Same API as db-firestore.js.
import { newGroupId } from './ids.js';

const KEY = 'split:localdb:v1';
const listeners = new Set();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? { groups: {} };
  } catch {
    return { groups: {} };
  }
}

function notify() {
  for (const fn of listeners) fn();
}

/** Read, change and write back the whole store. Throws if storage is full or unavailable. */
function mutate(change) {
  const data = load();
  const result = change(data);
  localStorage.setItem(KEY, JSON.stringify(data));
  notify();
  return result;
}

function getGroup(data, id) {
  const g = data.groups[id];
  if (!g) throw new Error('Group not found');
  return g;
}

// Changes made in another tab of this browser.
window.addEventListener('storage', (e) => {
  if (e.key === KEY || e.key === null) notify();
});

function subscribe(run) {
  listeners.add(run);
  queueMicrotask(run);
  return () => listeners.delete(run);
}

// Svelte state proxies can't be stored as-is; a JSON round-trip gives plain data.
const plain = (v) => JSON.parse(JSON.stringify(v));

export async function createGroup({ name, baseCurrency, members }) {
  const id = newGroupId();
  mutate((d) => {
    d.groups[id] = { group: { name, baseCurrency, members: plain(members), createdAt: Date.now() }, expenses: {} };
  });
  return id;
}

export async function updateGroup(id, fields) {
  mutate((d) => Object.assign(getGroup(d, id).group, plain(fields)));
}

export async function addMember(id, name) {
  mutate((d) => {
    const g = getGroup(d, id).group;
    if (!g.members.includes(name)) g.members.push(name);
  });
}

export function subscribeGroup(id, onData) {
  return subscribe(() => {
    const g = load().groups[id];
    onData(g ? { id, ...g.group } : null);
  });
}

export function subscribeExpenses(id, onData) {
  return subscribe(() => {
    const exps = load().groups[id]?.expenses ?? {};
    const list = Object.entries(exps).map(([eid, e]) => ({ id: eid, ...e }));
    list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
    onData(list);
  });
}

export async function saveExpense(groupId, id, data, createdAt) {
  mutate((d) => {
    const g = getGroup(d, groupId);
    g.expenses[id ?? newGroupId()] = {
      ...plain(data),
      createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
      updatedAt: Date.now(),
    };
  });
}

export async function deleteExpense(groupId, id) {
  mutate((d) => {
    delete getGroup(d, groupId).expenses[id];
  });
}
