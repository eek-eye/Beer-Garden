# Deploying Bar Chinesca Mxli

Three things get deployed: the public site, the staff check-in app, and the Firestore rules.
The first and third come from this repo; the staff app lives in its own (private) repo.

| What | Runs on | Deployed from |
|---|---|---|
| Public site — barchinesca.club | Cloudflare Pages | this repo, the **`public/`** folder |
| Staff check-in — /verificar | Firebase Hosting (`bar-chinesca-mxli`) | the `bar-checkin-staff` repo |
| Firestore rules | Firebase (`bar-chinesca-mxli`) | this repo: `firestore.rules` + `firebase.json` |

## Public site — Cloudflare Pages

Cloudflare Pages builds straight from the GitHub repo and publishes **only `public/`**.

Project settings:

- Build command: `exit 0` (plain static files, nothing to build)
- Build output directory: `public`
- Production branch: `main` — set it to `bionic/cloudflare-pages` while the migration is
  being tested, then switch it to `main` after that branch is merged

Deploying is just pushing to the production branch. Every build is kept, so a rollback is
*Deployments → pick the previous one → Rollback*, or a `git revert`.

Things that matter:

- **`public/_headers`** sets HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy and
  week-long caching for media. Pages parses it and never serves it.
- **`public/404.html` is required.** With no top-level 404 file, Pages assumes the site is a
  single-page app and answers every unknown URL with `index.html` and a `200`.
- Pages serves extensionless URLs (`/galeria` → `galeria.html`) and redirects `/galeria.html`
  to `/galeria` — the same behaviour the site's links already expect.
- **Nothing outside `public/` is ever published.** `firestore.rules`, `server.js`,
  `package.json` and the `.md` files stay in the repo and stay private.

Local check before pushing:

    python -m http.server 8080 --directory public

The local server has no extensionless routing, so use `/galeria.html` there.

## Firestore rules

    npx firebase-tools deploy --only firestore:rules --project bar-chinesca-mxli

Rules are enforced server-side, so they can ship independently of the site.

## Staff check-in app

Its own repo (private). Stamp the asset versions **first**, or a phone ends up mixing new HTML
with cached JS:

    python3 scripts/stamp-assets.py
    npx firebase-tools deploy --only hosting --project bar-chinesca-mxli

## History

The site used to be published by GitHub Pages from the repo root, which is why everything in
the repo — including the rules and `server.js` — was downloadable from barchinesca.club: on the
free plan, GitHub Pages requires a **public** repository and serves the whole root.

`CNAME` is kept only so that a rollback to Pages is possible. Cloudflare ignores it. If Pages is
ever switched back on, nothing outside the repo root would be served correctly any more.
