// Tiny hash router: "#/g/<groupId>" opens a group, anything else is home.
// Hash routing needs no server rewrites, and the group ID in the hash is
// never sent to the static host's logs.
function parse() {
  const m = location.hash.match(/^#\/g\/([A-Za-z0-9_-]{16,})/);
  return m ? m[1] : null;
}

export const route = $state({ groupId: parse() });

window.addEventListener('hashchange', () => {
  route.groupId = parse();
  window.scrollTo(0, 0);
});

export function goto(groupId) {
  location.hash = groupId ? `#/g/${groupId}` : '#/';
}
