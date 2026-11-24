// Per-browser conveniences in localStorage: "who am I" per group and recent groups.
// Wrapped in try/catch because storage can be unavailable (private mode etc.).
const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const getMe = (groupId) => safe(() => localStorage.getItem(`split:me:${groupId}`), null);
export const setMe = (groupId, name) => safe(() => localStorage.setItem(`split:me:${groupId}`, name));

export function recentGroups() {
  return safe(() => JSON.parse(localStorage.getItem('split:recent') || '[]'), []);
}

export function rememberGroup(id, name) {
  safe(() => {
    const list = recentGroups().filter((g) => g.id !== id);
    list.unshift({ id, name, at: Date.now() });
    localStorage.setItem('split:recent', JSON.stringify(list.slice(0, 12)));
  });
}

export function forgetGroup(id) {
  safe(() => localStorage.setItem('split:recent', JSON.stringify(recentGroups().filter((g) => g.id !== id))));
}
