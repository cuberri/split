# Split

A small web app for splitting group expenses. No sign-up, no backend to run.

- Equal or custom splits
- EUR and CHF, with exchange rates from [Frankfurter](https://frankfurter.dev) for the
  expense date, or a fixed rate per expense
- "Who owes whom" in any supported currency, with the fewest possible payments
- Mobile-friendly, light and dark theme

Built with Svelte 5 and Vite.

## Modes

- **Local mode** (default): data is saved in your browser only. No configuration needed.
- **Shared mode**: groups are shared by link with live updates, stored in
  [Cloud Firestore](https://firebase.google.com/docs/firestore). Set the variables listed in
  `.env.example` and publish the rules in `firestore.rules` to your Firebase project.

## Development

Requires Node.js 20 or later.

```bash
npm install
npm run dev      # start the dev server
npm test         # run the unit tests
npm run build    # build the static site into dist/
```

To use shared mode locally, copy `.env.example` to `.env.local` and fill in your Firebase web
app config.

## Deployment

`dist/` is a static site that works from any path. Pushes to `main` are deployed to GitHub
Pages by `.github/workflows/deploy.yml`. For shared mode, set the `VITE_FIREBASE_*` values as
repository variables under Settings → Secrets and variables → Actions → Variables.

## Adding a currency

Add an entry to `src/lib/currencies.js`. It must be a currency that Frankfurter supports.

## Privacy

In shared mode, anyone with a group's link can view and edit that group. Groups can't be
listed or discovered without the link.
