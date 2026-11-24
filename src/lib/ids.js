/** 128-bit random, URL-safe ID (22 chars). Unguessable, so it can act as the group's "password". */
export function newGroupId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
