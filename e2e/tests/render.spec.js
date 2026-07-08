const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// Utility / duplicate / backup / image-export pages that are not real user-facing content.
const EXCLUDE = /^(404|og-image.*|.*-cover|x-header|share-text|email-.*|brand-assets|deck.*|.*-sample|.*-backup.*|_.*)\.html$/i;

function discoverPages() {
  const out = [];
  const consider = (rel, file) => {
    if (file.endsWith('.html') && !EXCLUDE.test(file)) out.push(rel);
  };
  for (const f of fs.readdirSync(ROOT)) {
    if (fs.statSync(path.join(ROOT, f)).isFile()) consider(f, f);
  }
  const brandsDir = path.join(ROOT, 'brands');
  if (fs.existsSync(brandsDir)) {
    for (const f of fs.readdirSync(brandsDir)) consider('brands/' + f, f);
  }
  return out.sort();
}

const PAGES = discoverPages();

// Walk from the browser top to the bottom so every scroll-triggered reveal fires,
// then let transitions settle. A healthy page reveals its content here; a page whose
// reveal JS died (e.g. a thrown error) stays blank no matter how far you scroll.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += Math.round(window.innerHeight * 0.8);
        if (y < document.body.scrollHeight) setTimeout(step, 110);
        else { window.scrollTo(0, document.body.scrollHeight); setTimeout(resolve, 300); }
      };
      step();
    });
  });
  await page.waitForTimeout(1000);
}

// Measure how much on-page text is actually VISIBLE (not stuck at opacity:0).
// Elements hidden via display:none / visibility:hidden are intentional (responsive
// duplicates, menus) and excluded from the denominator — we only care about content
// that is in the layout but invisible, which is the blank-screen failure mode.
async function measureVisibleText(page) {
  return page.evaluate(() => {
    const effState = (el) => {
      let opacity = 1, n = el;
      while (n && n.nodeType === 1) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden') return 'excluded';
        const o = parseFloat(s.opacity);
        opacity *= isNaN(o) ? 1 : o;
        n = n.parentElement;
      }
      return opacity;
    };
    const els = [...document.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,blockquote,a.btn,.btn')]
      .filter((e) => (e.textContent || '').trim().length > 2);
    let inLayout = 0, visible = 0, visibleChars = 0;
    for (const e of els) {
      const chars = e.textContent.trim().length;
      const st = effState(e);
      if (st === 'excluded') continue;
      inLayout += chars;
      if (st > 0.1 && e.getBoundingClientRect().height > 0) { visible += chars; visibleChars += chars; }
    }
    return { inLayout, visibleChars, ratio: inLayout ? visible / inLayout : 1 };
  });
}

async function assertRenders(page, url, { blockThirdParty }) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));

  if (blockThirdParty) {
    // Simulate a content blocker / iCloud Private Relay / offline CDN: allow only the
    // page's own origin, abort every third-party host (cdnjs, google fonts, gtag, ...).
    await page.route('**', (route) => {
      let host = '';
      try { host = new URL(route.request().url()).hostname; } catch { /* data: etc. */ }
      if (host === '' || host === 'localhost' || host === '127.0.0.1') route.continue();
      else route.abort();
    });
  }

  await page.goto(url, { waitUntil: 'load' });
  await scrollThrough(page);
  const m = await measureVisibleText(page);

  const ctx = blockThirdParty ? ' [third-party blocked]' : '';

  // Always: no uncaught exceptions (a thrown error is what blanked the page originally),
  // and the page is not near-empty.
  expect(errors, `Uncaught JS error${ctx} on ${url}: ${errors.join(' | ')}`).toEqual([]);
  expect(m.visibleChars, `Almost no visible text${ctx} on ${url} — page likely rendered blank`).toBeGreaterThan(120);

  // The strict "content is actually visible" check belongs in the blocked scenario: that
  // is the failure mode (content stuck at opacity:0 because the reveal never ran), and our
  // .js-fallback forces instant, transition-free visibility there. In the normal scenario,
  // real GSAP scroll-reveal animates content in progressively, so a single post-scroll
  // snapshot is an unreliable opacity measure — we only guard against a fully blank render.
  const minRatio = blockThirdParty ? 0.4 : 0.15;
  expect(m.ratio, `Content stuck invisible${ctx} on ${url} (visible ratio ${m.ratio.toFixed(2)}, need > ${minRatio})`).toBeGreaterThan(minRatio);
}

test.describe('site renders on WebKit', () => {
  test.beforeAll(() => {
    // Fail loudly if discovery breaks, rather than silently testing nothing.
    expect(PAGES.length, 'no pages discovered to test').toBeGreaterThan(0);
  });

  for (const rel of PAGES) {
    const url = '/' + rel;
    test(`${rel} — renders normally`, async ({ page }) => {
      await assertRenders(page, url, { blockThirdParty: false });
    });

    test(`${rel} — renders with third-party scripts blocked`, async ({ page }) => {
      await assertRenders(page, url, { blockThirdParty: true });
    });
  }
});
