// Which build is running. The deploy workflow sets these variables; a local
// `npm run dev` or `npm run build` without them shows "dev".
const build = import.meta.env.VITE_APP_BUILD; // GitHub Actions run number, e.g. "42"
const commit = import.meta.env.VITE_APP_COMMIT; // full commit SHA
const repoUrl = import.meta.env.VITE_APP_REPO_URL; // e.g. https://github.com/<you>/<repo>

export const version = {
  label: build ? `build ${build}${commit ? ` · ${commit.slice(0, 7)}` : ''}` : 'dev',
  commitUrl: repoUrl && commit ? `${repoUrl}/commit/${commit}` : null,
  builtAt: __BUILD_TIME__,
};
