#!/usr/bin/env node
// Builds the static data files the site reads, from the public Buzzar catalogue API.
//
//   node scripts/build-data.mjs                       fetch everything live (respects the API rate limit)
//   node scripts/build-data.mjs --from ./snapshot     use a folder holding feed.json, taxonomy.json and details/<id>.json
//
// Output:
//   data/catalogue.json        every listing, compact keys, cleaned and normalised
//   data/meta.json             taxonomy, industries, regions, platforms, providers and counts
//   data/listings/<id>.json    the full detail of one listing, loaded when a buyer opens it
//
// Cleaning applied (each item fixes something seen in the live catalogue):
//   - ~50 free-text industry labels are folded into 22 canonical industries
//   - platform casing is unified (aws / AWS, on-prem / On-premises, ...)
//   - "proposed-redington-" slug prefixes are removed, with collisions resolved
//   - unreviewed popularity signals (rating, reviewCount) are dropped, never shown
//   - deliverable fragments are sentence-cased; duplicate terms removed

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const API = process.env.BUZZAR_API || 'https://xmanr5qvdd.execute-api.us-east-1.amazonaws.com';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'data');
const fromIdx = process.argv.indexOf('--from');
const FROM = fromIdx > -1 ? path.resolve(process.argv[fromIdx + 1]) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * 2 ** i);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}

async function load() {
  if (FROM) {
    const feed = JSON.parse(await readFile(path.join(FROM, 'feed.json'), 'utf8'));
    const taxonomy = JSON.parse(await readFile(path.join(FROM, 'taxonomy.json'), 'utf8'));
    const details = new Map();
    for (const it of feed.items) {
      const f = path.join(FROM, 'details', `${it.id}.json`);
      if (existsSync(f)) {
        try {
          details.set(it.id, JSON.parse(await readFile(f, 'utf8')));
        } catch {
          /* skip a broken file; the listing still shows its summary */
        }
      }
    }
    return { feed, taxonomy, details };
  }
  const feed = await getJson(`${API}/api/catalogue/feed.json`);
  const taxonomy = await getJson(`${API}/api/taxonomy`);
  const details = new Map();
  let n = 0;
  for (const it of feed.items) {
    details.set(it.id, await getJson(`${API}/api/catalogue/${it.id}`));
    if (++n % 50 === 0) console.log(`  details ${n}/${feed.items.length}`);
    await sleep(520); // the API allows 120 requests a minute
  }
  return { feed, taxonomy, details };
}

// ---------- normalisers ----------

export const INDUSTRIES = {
  'cross-industry': { label: 'Cross-industry', icon: 'spark' },
  'financial-services': { label: 'Financial services', icon: 'bank' },
  retail: { label: 'Retail & e-commerce', icon: 'bag' },
  healthcare: { label: 'Healthcare', icon: 'pulse' },
  'life-sciences': { label: 'Life sciences', icon: 'flask' },
  manufacturing: { label: 'Manufacturing', icon: 'gear' },
  media: { label: 'Media & entertainment', icon: 'play' },
  'technology-software': { label: 'Technology & software', icon: 'chip' },
  education: { label: 'Education & research', icon: 'cap' },
  telecommunications: { label: 'Telecommunications', icon: 'tower' },
  'gaming-and-esports': { label: 'Gaming & esports', icon: 'pad' },
  'professional-services': { label: 'Professional services', icon: 'brief' },
  'public-sector': { label: 'Public sector', icon: 'columns' },
  hospitality: { label: 'Travel & hospitality', icon: 'bed' },
  logistics: { label: 'Logistics & distribution', icon: 'truck' },
  aviation: { label: 'Aviation', icon: 'plane' },
  agriculture: { label: 'Agriculture', icon: 'leaf' },
  automotive: { label: 'Automotive', icon: 'car' },
  'construction-real-estate': { label: 'Construction & real estate', icon: 'crane' },
  'consumer-goods': { label: 'Consumer goods', icon: 'box' },
  utilities: { label: 'Energy & utilities', icon: 'bolt' },
  'oil-gas': { label: 'Oil & gas', icon: 'drop' },
};

const INDUSTRY_ALIASES = {
  banking: 'financial-services',
  'financial services': 'financial-services',
  'banking and financial services': 'financial-services',
  insurance: 'financial-services',
  'retail and ecommerce': 'retail',
  ecommerce: 'retail',
  'healthcare and hospital groups': 'healthcare',
  pharmaceuticals: 'life-sciences',
  'digital services': 'technology-software',
  'digital businesses': 'technology-software',
  research: 'education',
  telecom: 'telecommunications',
  'professional services': 'professional-services',
  'business process outsourcing': 'professional-services',
  'shared services': 'professional-services',
  'travel and hospitality': 'hospitality',
  travel: 'hospitality',
  distribution: 'logistics',
  'ecommerce and logistics': 'logistics',
  'automotive distribution and aftersales': 'automotive',
  construction: 'construction-real-estate',
  'construction products': 'construction-real-estate',
  'consumer goods': 'consumer-goods',
  'beauty and cosmetics': 'consumer-goods',
  'energy-and-utilities': 'utilities',
  energy: 'utilities',
  renewables: 'utilities',
};

function normIndustry(raw) {
  const k = String(raw).trim().toLowerCase();
  if (INDUSTRIES[k]) return k;
  return INDUSTRY_ALIASES[k] || null;
}

const PLATFORM = {
  aws: 'AWS',
  azure: 'Azure',
  'google cloud': 'Google Cloud',
  gcp: 'Google Cloud',
  hybrid: 'Hybrid',
  'on-premises': 'On-premises',
  'on-prem': 'On-premises',
};
const normPlatform = (p) => PLATFORM[String(p).trim().toLowerCase()] || null;

const REGION = { gcc: 'GCC', emea: 'EMEA', india: 'India', uae: 'UAE', ksa: 'KSA', africa: 'Africa', me: 'Middle East' };
const normRegion = (r) => REGION[String(r).trim().toLowerCase()] || String(r).trim();

const uniq = (a) => [...new Set(a.filter(Boolean))];
const sentence = (s) => {
  const t = String(s).trim().replace(/\.+$/, '');
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

function cleanSlug(slug, used) {
  let s = slug.replace(/^proposed-redington-/, '').replace(/^proposed-/, '');
  if (used.has(s)) s = `${s}-service`;
  let n = 2;
  const base = s;
  while (used.has(s)) s = `${base}-${n++}`;
  used.add(s);
  return s;
}

// ---------- build ----------

async function main() {
  console.log(FROM ? `Reading snapshot from ${FROM}` : `Fetching from ${API}`);
  const { feed, taxonomy, details } = await load();

  const subLabel = {};
  for (const c of taxonomy.categories) for (const s of c.subcategories) subLabel[`${c.code}:${s.slug}`] = s.label;

  // products first so the product keeps the plain slug and the partner service gets "-service"
  const items = [...feed.items].sort((a, b) => (a.slug.startsWith('proposed-') ? 1 : 0) - (b.slug.startsWith('proposed-') ? 1 : 0));
  const used = new Set();
  const slugOf = new Map();
  for (const it of items) slugOf.set(it.slug, cleanSlug(it.slug, used));

  const catalogue = [];
  await rm(path.join(OUT, 'listings'), { recursive: true, force: true });
  await mkdir(path.join(OUT, 'listings'), { recursive: true });

  const byTitle = new Map();
  for (const it of feed.items) {
    if (!byTitle.has(it.title)) byTitle.set(it.title, []);
    byTitle.get(it.title).push(it);
  }

  for (const it of feed.items) {
    const d = details.get(it.id);
    const c = d?.content || {};
    const industries = uniq([...(it.industries || []), ...(c.industries || [])].map(normIndustry));
    const platforms = uniq([...(it.platforms || []), ...(c.platforms || [])].map(normPlatform));
    const regions = uniq([...(it.regions || []), ...(c.regions || [])].map(normRegion));
    const subs = uniq((it.tags || []).map((t) => (subLabel[t] ? t : null)));
    const slug = slugOf.get(it.slug);

    const twins = (byTitle.get(it.title) || []).filter((x) => x.id !== it.id).map((x) => x.id);

    catalogue.push({
      id: it.id,
      slug,
      t: it.title,
      y: it.offeringType,
      c: it.category,
      p: it.provider?.name || 'Redington',
      k: it.provider?.kind || 'isv',
      s: it.summary,
      i: industries.length ? industries : ['cross-industry'],
      r: regions,
      pl: platforms,
      sc: subs,
      b: !!it.marketplaceBuyable,
      u: it.updatedAt?.slice(0, 10),
      pr: c.signals?.practice || null,
      v: it.versionNo || d?.versionNo || 1,
      ns: (c.skus || []).length,
      aws: (c.skus || []).some((s) => (s.routes || []).includes('aws_marketplace_private_offer')),
      dm: uniq((c.deploymentModels || []).map((m) => ({ on_premises: 'On-premises', hybrid: 'Hybrid', cloud: 'Cloud', saas: 'SaaS' })[m] || m)),
      db: d?.durationBand?.label || null,
      rd: it.freshness?.nextReviewDue || null,
      ...(twins.length ? { tw: twins } : {}),
    });

    if (d) {
      const overview = c.overview && c.overview.trim() !== (c.outcome || '').trim() ? c.overview : null;
      const related = uniq((c.signals?.relatedSlugs || []).map((s) => slugOf.get(s) || null));
      const detail = {
        id: it.id,
        version: d.versionNo,
        outcome: c.outcome || it.summary,
        overview,
        kpi: c.signals?.primaryKpi || null,
        evidenceTier: c.signals?.evidenceTier ?? null,
        benefits: (c.benefits || []).map((b) => ({
          text: b.benefit,
          kind: b.kind,
          source: b.source,
          limits: b.limitations,
        })),
        audience: c.audience || [],
        orgSizes: c.orgSizes || [],
        maturity: c.maturity || [],
        residency: c.dataResidency || null,
        notFor: (c.notFor || []).map((n) => ({ situation: n.situation, why: n.why })),
        scope: c.scopeOfWork || null,
        deliverables: uniq((c.deliverables || []).map(sentence)),
        effort: c.estimatedEffort || null,
        roles: c.audience || [],
        languages: c.languages || null,
        presales: c.presales ? { team: c.presales.team, practice: c.presales.practice } : null,
        delivery: c.service
          ? {
              model: c.service.engagementModel || null,
              weeks: c.service.duration ? [c.service.duration.weeksMin, c.service.duration.weeksMax] : null,
              method: c.service.deliveryMethod || [],
              prerequisites: c.service.customerPrerequisites || [],
              pricing: c.service.pricingModel || null,
              sample: !!c.service.sample,
            }
          : null,
        skus: (c.skus || []).map((s) => ({
          code: s.code,
          edition: s.edition,
          name: s.name,
          unit: s.billingUnit,
          model: s.pricingModel,
          terms: uniq(s.terms || []),
          routes: uniq(s.routes || []),
          included: uniq((s.included || []).map(sentence)),
          sample: !!s.sample,
        })),
        related,
      };
      await writeFile(path.join(OUT, 'listings', `${it.id}.json`), JSON.stringify(detail));
    }
  }

  catalogue.sort((a, b) => a.t.localeCompare(b.t));

  const count = (fn) => {
    const m = {};
    for (const x of catalogue) for (const v of [].concat(fn(x))) m[v] = (m[v] || 0) + 1;
    return m;
  };
  const providers = Object.entries(count((x) => x.p))
    .map(([name, n]) => ({ name, n, kind: catalogue.find((x) => x.p === name).k }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  const meta = {
    builtAt: new Date().toISOString(),
    source: API,
    total: catalogue.length,
    withDetail: details.size,
    categories: taxonomy.categories.map((c) => ({
      code: c.code,
      label: c.label,
      subs: c.subcategories.map((s) => ({ key: `${c.code}:${s.slug}`, label: s.label })),
    })),
    industries: Object.fromEntries(Object.entries(INDUSTRIES).map(([k, v]) => [k, v])),
    counts: {
      type: count((x) => x.y),
      category: count((x) => x.c),
      industry: count((x) => x.i),
      platform: count((x) => x.pl),
      region: count((x) => x.r),
      sub: count((x) => x.sc),
    },
    providers,
  };

  await writeFile(path.join(OUT, 'catalogue.json'), JSON.stringify(catalogue));
  await writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta));
  console.log(`Wrote ${catalogue.length} listings (${details.size} with detail), ${providers.length} providers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
