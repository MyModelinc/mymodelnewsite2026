# Render checks (mobile Safari resilience)

Automated guard against the class of bug where a page **works in Chrome/dev but renders
blank on mobile Safari** — typically because content is hidden by default and only
revealed by JavaScript that depends on a third-party CDN script (GSAP, etc.). On iOS,
content blockers and iCloud Private Relay routinely block those requests; if the script
throws, nothing becomes visible.

## What it does

For every real page, in **WebKit** (the engine mobile Safari and all iOS browsers use),
desktop and iPhone viewports, it loads the page twice:

1. **Normal** — asserts no uncaught JS errors and that the page isn't blank.
2. **Third-party blocked** — aborts every non-origin request (simulating a content
   blocker / Private Relay / dead CDN) and asserts the page *still* renders its content
   visibly. This is the exact condition that blanked `/brands` and `/for-the-people`.

Pages are auto-discovered from the repo root; backups, deck exports, and image/OG pages
are excluded (see `EXCLUDE` in `tests/render.spec.js`).

## Run locally

```bash
cd e2e
npm install
npx playwright install webkit   # one time
npm test                        # runs the suite (starts a static server automatically)
npm run report                  # open the HTML report after a failure
```

Run a single page: `npx playwright test --grep "for-the-people.html"`.

## CI

`.github/workflows/render-check.yml` runs this on every push to `main` and every PR.
A red check means a page would render blank under blocked third-parties — fix before it
deploys. The resilience pattern to apply is in the committed pages: `defer` the CDN
scripts, guard the library with a no-op shim, and add a `.js-fallback` CSS block that
force-shows scroll-gated content when the library or IntersectionObserver is unavailable.
