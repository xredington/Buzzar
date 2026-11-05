# Buzzar — the business solution marketplace

A redesigned front end for the Buzzar catalogue. Buyers can explore 1,265 governed products, services and accelerators across cloud, data, AI, security and software, find what fits their situation, compare options, and take the next step with Redington.

It is a static site: plain HTML, CSS and JavaScript modules, with no build step and no dependencies. It runs on any static host (GitHub Pages, S3 + CloudFront, Netlify, Azure Static Web Apps).

## Run it

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. A local server is needed because the browser blocks `fetch()` from `file://`.

## What's inside

| Page | Route | What it does |
|---|---|---|
| Home | `#/` | Interactive honeycomb of practices and industries, a bee flying a pollen trail, Ask Buzzar, live counts, provider marquee, guided-discovery teaser, recent listings, the six-stage journey, accelerators, industries |
| Catalogue | `#/catalogue?type=&cat=&ind=&plat=&reg=&prov=&sub=&q=&sort=&page=` | Faceted search over the **whole** catalogue. Each facet's counts treat that facet's own selection as unset, so options never disappear when you pick one. Search terms are highlighted, results paginate, and the URL captures the filters so a view can be shared |
| Listing | `#/listing/{slug}` | Generated hexagon art, outcome and success measure, a readiness ring with a six-stage tracker, benefits labelled with their evidence basis, who it is for and who it is *not* for, scope as numbered steps, deliverables, buying tiers, related listings, a sticky request panel and an on-page table of contents |
| Guided discovery | `#/discover` | Industry → perspective → challenge → a ranked shortlist with "why it's here" reasons. The state lives in the URL |
| Ask Buzzar | `#/ask?q=` | Free-text matching. It works out the industry, practice, platform and region from the question, explains every match, and suggests follow-ups that sharpen the shortlist |
| Compare | `#/compare` | Up to 3 side by side. Rows that differ are highlighted |
| Saved / My journey | `#/saved`, `#/journey` | Saved listings; a board with Exploring, Shortlisted and Talking to Redington columns; and the buyer's requests |
| Industries, Providers | `#/industries`, `#/providers` | Industry grid with a practice-mix bar; A–Z provider directory with search |
| How it works, Partners, Agents | `#/how-it-works`, `#/partners`, `#/agents` | Governance explained, partner onboarding, and the public API for agents |

Light and dark ("After hours") themes, keyboard support (press `/` to ask), reduced-motion support, and a layout that works down to 360px.

## Data

`data/` is a cleaned snapshot of the public Buzzar catalogue API, produced by `scripts/build-data.mjs`:

- `catalogue.json`: every listing, with compact keys (about 670 KB, about 120 KB gzipped)
- `meta.json`: taxonomy, industries, counts and providers
- `listings/{id}.json`: one listing's full detail, loaded only when that listing is opened

Refresh the snapshot from the live API. This takes about 12 minutes because it stays under the 120 requests a minute rate limit:

```bash
node scripts/build-data.mjs
```

Or rebuild from a saved snapshot folder (`feed.json`, `taxonomy.json`, `details/<id>.json`):

```bash
node scripts/build-data.mjs --from ./snapshot
```

### Data fixes compared with the live site

- About 50 free-text industry labels are folded into 22 canonical industries (for example, `banking`, `Insurance` and `financial services` all become **Financial services**)
- Platform casing is unified (`aws`/`AWS`, `on-prem`/`On-premises`)
- The `proposed-redington-` prefix is removed from 404 slugs, with collisions resolved
- Product and service listings that share a title are cross-linked ("Also on Buzzar as a service…")
- A summary that repeats the overview is no longer shown twice
- Deliverable fragments are sentence-cased, and duplicate terms are removed
- Unreviewed popularity signals (`rating`, `reviewCount`) are dropped and never shown

## Requests

Request forms (discovery call, standard proposal, custom proposal, private offer) are saved on the buyer's device and appear under My journey. To forward them to a CRM, set `requestEndpoint` in `assets/js/config.js` to an HTTPS endpoint that accepts a JSON POST.

## Privacy

Ask Buzzar and guided discovery run entirely in the browser. Questions are never stored or sent anywhere. Saved, compare and journey lists live in `localStorage` on the buyer's device.

## Structure

```
index.html
assets/css/main.css         design system (tokens, light and dark themes, components)
assets/js/main.js           router, header, theme, badges
assets/js/data.js           loading, labels, filtering, matching, readiness
assets/js/ui.js             DOM helper, icons, brand mark, generated art, local lists
assets/js/components.js     cards, compare tray, request dialog
assets/js/config.js         settings
assets/js/views/*.js        one module per page, loaded on demand
scripts/build-data.mjs      catalogue snapshot builder
data/                       generated catalogue snapshot
```
