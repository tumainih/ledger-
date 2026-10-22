# Duka Ledger — Static (Netlify) Version

A pure HTML/CSS/JS rewrite of the Streamlit Duka Ledger app, ready to deploy
on Netlify with no build step and no server required.

## What's inside

- `index.html` — page structure (hero, metrics, 3 tabs: Andika Ujumbe, Rectification, Tafuta)
- `styles.css` — the same visual design system (gradient hero, metric cards, pill tabs, decorated card output)
- `app.js` — all app logic (cart, items, entries, search, card builders)
- `netlify.toml` — tells Netlify to publish the folder as-is

## Features carried over

- **Andika Ujumbe**: multi-select checklist of items — tick several, set one
  quantity, and add them all to the cart in a single click ("➕ Ongeza Zote").
  Edit quantity/price per cart row, remove rows, save the order, and record
  payments.
- **Decorated cards**: every generated card (order, payment, search results)
  is stamped with the real device time **plus the Swahili day name**
  (Jumatatu, Jumanne, …) at the exact moment the card is created, and is
  wrapped in a bordered, emoji-decorated layout. A "📎 Nakili Kadi" button
  copies the card text to the clipboard.
- **Rectification**: edit an existing item's name/price (renames cascade to
  historical entries), add new items, view the full item table, delete items.
- **Tafuta**: filter records by date range, item name, and cost comparison,
  see totals, and generate a decorated results card.

## Offline support

Yes — this works fully offline, in two layers:

1. **No external network calls at all.** There's no Google Fonts CDN or any
   other external resource — everything (fonts, styles, logic) is
   self-contained in this folder. That means you can even double-click
   `index.html` and use the full app straight from your file system, no
   internet or server needed, ever.
2. **Installable + cached for repeat offline visits once deployed.**
   `sw.js` (a service worker) caches `index.html`, `styles.css`, `app.js`,
   `manifest.json`, and `icon.svg` the first time you load the site online.
   After that, the page keeps working even with no connection, and
   `manifest.json` lets phones/desktops "Add to Home Screen" / install it
   like a native app. (Service workers only activate over `https://` or
   `localhost` — Netlify serves https by default, so this kicks in
   automatically once deployed; opening the file directly via `file://`
   skips the service worker but still works, per point 1.)

Since all data is saved to `localStorage` (see the note below), nothing
about offline use requires a round-trip to any server — the ledger reads
and writes are 100% local to the browser regardless of connectivity.

## Deploying to Netlify

**Option A — drag and drop (fastest):**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag this whole folder onto the page.
3. Netlify gives you a live URL immediately.

**Option B — Git-connected site:**
1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: leave blank. Publish directory: `.` (already set in `netlify.toml`).
4. Deploy.

**Option C — Netlify CLI:**
```bash
npm install -g netlify-cli
cd duka-ledger-netlify
netlify deploy --prod
```

## Important limitation: where data lives

The original app used a shared SQLite file (`ledger.db`) on a server, so
everyone hitting the app saw the same ledger. This static version has **no
server**, so it stores items and entries in the browser's `localStorage`
instead. That means:

- Data persists across reloads on the **same browser, same device**.
- Two different people (or the same person on their phone vs. laptop) will
  each see their **own separate ledger** — nothing syncs between them.
- Clearing browser data/history wipes the ledger.

If you need one shared ledger that everyone sees (multiple shopkeepers,
multiple devices), you'll need real backend storage — for example:
- A small [Netlify Function](https://docs.netlify.com/functions/overview/)
  backed by a hosted database (Supabase, Turso, FaunaDB, etc.), or
- Keeping the original Streamlit app on a host that supports Python
  (Streamlit Community Cloud, Render, Railway, etc.).

Happy to wire up shared storage (e.g. Supabase) if that's what you need next
— just say the word.
