# Buzzar — the business solution marketplace

> **Home is the ask (latest).** Type what you want to change; Buzzar asks up to three quick questions as tap cards (skipping any your words already answer), then shows your solution: the product, the service and, when one fits, the accelerator, each with why it fits and how it is priced, sendable as one request, plus more matches by kind. **Product pages are product sheets:** key facts and a buy box with every edition (pricing model, billing, term, buying routes, what is included, private offer), and tabs for Overview, Features (with an included-by-edition matrix), Pricing (edition comparison), Delivery, Who it fits and Readiness.
>
> **Providers: the partner orbit.** Redington sits at the centre and vendors circle it in slow rings sized by their listings; hover pauses and names a logo, a click opens a provider panel (mix of products, services and accelerators, categories, top listings, ask Sami). Below sits a searchable logo wall. About 200 real provider logos live in `assets/logos/` (vector marks from Simple Icons where available, otherwise high resolution site icons; built by `scripts/build-logos.py`) and also appear on catalogue tiles, quick views and listing headers. Providers without a usable logo get a typographic mark.
>
> **Latest (this branch): the catalogue field.** The home page is one screen and the catalogue itself is the picture: all 1,265 listings are dots in five category clusters, ringed by kind (accelerators at the core, then products, then services). Type what you want to change and the matching dots light up while the rest fade; hover a dot to name it, click to open a quick view, click a cluster to browse it. Text is cut to a heading, one line and the ask bar; listing explanations are folded into tags and "Read more". Built on the premium edition below.
>
> **Premium edition (this branch).** Redesigned with the elayadesign skills ([landing-page-design](https://github.com/elayadesign/ai-design-skills) and [redesign-existing-projects](https://github.com/elayadesign/redesign-skill)) and 21st.dev patterns, on top of the UI & CX handover's content model.
> - **Less scrolling:** home is under two screens; listings use tabs; catalogue tiles open a quick view slide over.
> - **The page answers as you type:** the home live panel matches the catalogue on each keystroke, grouped by kind, and Sami's orb reacts.
> - **Command menu:** press ⌘K, Ctrl K or / anywhere to search listings, jump to pages or ask Sami.
> - **Visual system:** Geist only (Geist Mono for codes), named text styles on the Tailwind scale, the 2 to 96px spacing scale, one accent (Buzzar green), flat surfaces with grain, a black to grey text gradient on hero headings only, Phosphor icons, a floating glass nav, a full height menu with staggered links, scroll reveals and a word by word tagline reveal, all on cubic-bezier(0.22, 1, 0.36, 1), with reduced motion respected.
> - **Ship requirements:** custom 404, privacy and terms pages, og image, skip link, form validation, no hyphens in interface copy.
>
> **Talk to Sami (`#/advisor`)** keeps the handover's discovery board, three answer lanes and the Solution step with first SKU lines, sendable as one private offer request.

A redesigned front end for the Buzzar catalogue. Buyers can explore 1,265 governed products, services and accelerators across cloud, data, AI, security and software, find what fits their situation, compare options, and take the next step with Redington.

It is a static site: plain HTML, CSS and JavaScript modules, with no build step and no dependencies. It runs on any static host (GitHub Pages, S3 + CloudFront, Netlify, Azure Static Web Apps).

## Deploy (Vercel)

Import the repository at vercel.com/new, keep Framework Preset "Other", no build command, output directory `.` (the repository root). Every push to `main` then redeploys automatically. `vercel.json` sets caching so browsers always get fresh scripts and data.

### Analytics

Vercel Web Analytics is wired in without a build step: `index.html` loads Vercel's script (the same loader `@vercel/analytics` uses) on the deployed site only, and the router sends one page view per route (for example `/catalogue`, `/listing/[slug]`), since routes live in the `#/` hash. Two events are counted: `Ask` (never the words typed) and `Request` (request type only, no names or emails). Turn it on in Vercel: Project → Analytics → Enable, then redeploy.

### Releasing

Before each release, stamp every script, stylesheet and data file with a fresh version so browsers never mix an old cached file with new ones:

```bash
python3 scripts/version.py
```

## Run it

```bash
python3 serve.py
```

Then open http://localhost:8080. A local server is needed because the browser blocks `fetch()` from `file://`.

## What's inside

| Page | Route | What it does |
|---|---|---|
| Home | `#/` | Interactive honeycomb of practices and industries, a bee flying a pollen trail, Ask Buzzar, live counts, provider marquee, guided-discovery teaser, recent listings, the six-stage journey, accelerators, industries |
| Catalogue | `#/catalogue?type=&cat=&ind=&plat=&reg=&prov=&sub=&q=&sort=&page=` | Faceted search over the **whole** catalogue. Each facet's counts treat that facet's own selection as unset, so options never disappear when you pick one. Search terms are highlighted, results paginate, and the URL captures the filters so a view can be shared |
| Listing | `#/listing/{slug}` | Generated hexagon art, outcome and success measure, a readiness ring with a six-stage tracker, benefits labelled with their evidence basis, who it is for and who it is *not* for, scope as numbered steps, deliverables, buying tiers, related listings, a sticky request panel and an on-page table of contents |
| Guided discovery | `#/discover` | Industry → perspective → challenge → a ranked shortlist with "why it's here" reasons. The state lives in the URL |
| Talk to Sami | `#/advisor?q=` | Discovery board, questions, three-lane answers, gaps, Solution step with SKUs, listing Q&A, mission plans, voice. `#/ask` redirects here |
| Compare | `#/compare` | Up to 3 side by side. Rows that differ are highlighted |
| Saved / My journey | `#/saved`, `#/journey` | Saved listings; a board with Exploring, Shortlisted and Talking to Redington columns; and the buyer's requests |
| Industries, Providers | `#/industries`, `#/providers` | Industry grid with a practice-mix bar; A–Z provider directory with search |
| How it works, Partners, Agents | `#/how-it-works`, `#/partners`, `#/agents` | Governance explained, partner onboarding, and the public API for agents |

A white theme, keyboard support (press `/` to ask), reduced-motion support, and a layout that works down to 360px.

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

Sami (in on-device mode) and guided discovery run entirely in the browser. Questions are never stored or sent anywhere. Live AI mode sends the brief to the Buzzar API. Saved, compare and journey lists live in `localStorage` on the buyer's device.

## Structure

```
index.html
assets/css/main.css         base design system
assets/css/premium.css      design tokens, text styles, nav, command menu, home, tiles, quick view, tabs, Sami
assets/js/orb.js            the Sami B particle orb
assets/js/plan.js           mission plans (shared by listings and Sami)
assets/img/                 Buzzar logo, practice imagery, industry photos (photo/) and capability objects (sub/), all WebP
assets/js/main.js           router, header, theme, badges
assets/js/data.js           loading, labels, filtering, matching, readiness
assets/js/ui.js             DOM helper, icons, brand mark, generated art, local lists
assets/js/components.js     cards, compare tray, request dialog
assets/js/config.js         settings
assets/js/views/*.js        one module per page, loaded on demand
scripts/build-data.mjs      catalogue snapshot builder
data/                       generated catalogue snapshot
```
