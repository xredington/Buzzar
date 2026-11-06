// Loads the catalogue snapshot and provides labels, filtering, search and matching.
// Everything runs in the browser: no question or choice leaves the device.

let catalogue = [];
let logos = {};
let meta = null;
const byId = new Map();
const bySlug = new Map();
const detailCache = new Map();

export const TYPE = {
  product: { label: 'Product', plural: 'Products', blurb: 'Software you license from vendors, supported by Redington.' },
  service: { label: 'Service', plural: 'Services', blurb: 'Work done for you by Redington and its partners.' },
  accelerator: { label: 'Accelerator', plural: 'Accelerators', blurb: 'Ready programmes that get you from idea to pilot in weeks.' },
};

export const CAT_BLURB = {
  CLD: 'Landing zones, migration, modernisation and FinOps across AWS, Azure and hybrid estates.',
  DNA: 'Lakehouses, pipelines, governance and BI that turn scattered records into decisions.',
  AI: 'Generative AI, prediction, vision and automation, with responsible-AI guardrails.',
  SEC: 'Identity, zero trust, detection and response, and compliance you can evidence.',
  SW: 'Modern apps, integration, DevOps and platform engineering for the long run.',
};

const ROUTE = {
  aws_marketplace_private_offer: 'AWS Marketplace private offer',
  azure_marketplace_private_offer: 'Azure Marketplace private offer',
  redington_resale: 'Redington resale',
  redington_service: 'Redington service',
  partner_delivery: 'Partner delivery',
};
const MODEL = {
  annual_subscription: 'Annual subscription',
  fixed_price: 'Fixed price',
  time_and_materials: 'Time and materials',
  usage_based: 'Usage based',
  monthly_subscription: 'Monthly subscription',
  perpetual: 'Perpetual licence',
};
const nice = (s) => (s ? String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');
export const label = {
  route: (r) => ROUTE[r] || nice(r),
  model: (m) => MODEL[m] || nice(m),
  unit: (u) => nice(u),
  term: (t) => (t === 'one_off' ? 'One-off' : nice(t)),
  size: (s) => ({ smb: 'Small business', 'mid-market': 'Mid market', enterprise: 'Enterprise', 'public-sector': 'Public sector' })[s] || nice(s).replace(/-/g, ' '),
};

export async function load() {
  if (catalogue.length) return;
  const [c, m, l] = await Promise.all([fetch('data/catalogue.json').then((r) => r.json()), fetch('data/meta.json').then((r) => r.json()), fetch('data/logos.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
  catalogue = c;
  meta = m;
  logos = l;
  for (const it of catalogue) {
    byId.set(it.id, it);
    bySlug.set(it.slug, it);
    it._subs = it.sc.map(subLabel);
    it._ind = it.i.map(industryLabel);
    it._hay = norm([it.t, it.p, it.s, it._subs.join(' '), it._ind.join(' '), it.pr || '', catLabel(it.c), it.pl.join(' ')].join(' '));
    it._title = norm(it.t + ' ' + it._subs.join(' '));
  }
}

export const all = () => catalogue;
export const getMeta = () => meta;
export const get = (id) => byId.get(id);
export const getBySlug = (s) => bySlug.get(s) || byId.get(s);
export const catLabel = (c) => meta?.categories.find((x) => x.code === c)?.label || c;
// copy rule: no hyphens in visible text
export const plain = (s) => String(s ?? '').replace(/e-commerce/gi, 'ecommerce').replace(/(\w)-(\w)/g, '$1 $2');
export const industryLabel = (k) => plain(meta?.industries[k]?.label || k).replace(/ & /g, ' and ');
export const industryIcon = (k) => meta?.industries[k]?.icon || 'spark';
const subMap = new Map();
export function subLabel(key) {
  if (!subMap.size && meta) for (const c of meta.categories) for (const s of c.subs) subMap.set(s.key, s.label);
  return subMap.get(key) || key.split(':')[1];
}

export async function detail(id) {
  if (detailCache.has(id)) return detailCache.get(id);
  const p = fetch(`data/listings/${id}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  detailCache.set(id, p);
  return p;
}

// ---------- text ----------
const STOP = new Set(
  'a an the and or of to for in on with my our we i me us is are be want need help looking find some any how can that this it from into at by as do does like would should could about across using use more less better improve get make'.split(
    ' ',
  ),
);
export const norm = (s) =>
  ' ' +
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() +
  ' ';
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '') || w;
export function tokens(q) {
  return norm(q)
    .trim()
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const SYN = {
  churn: ['retention', 'loyalty', 'customer'],
  stockout: ['inventory', 'replenishment', 'demand', 'forecast'],
  stock: ['inventory', 'replenishment', 'forecasting', 'demand'],
  markdown: ['pricing', 'waste', 'markdown'],
  throw: ['waste', 'markdown', 'perishable'],
  waste: ['waste', 'markdown', 'perishable', 'sustainability'],
  fresh: ['perishable', 'fresh', 'markdown'],
  food: ['perishable', 'grocery', 'fresh'],
  grocery: ['perishable', 'grocery', 'fresh', 'demand'],
  running: ['stockout', 'availability', 'replenishment'],
  fraud: ['fraud', 'anomaly', 'risk'],
  hack: ['security', 'threat', 'incident'],
  breach: ['security', 'incident', 'response', 'threat'],
  ransomware: ['backup', 'recovery', 'resilience', 'threat'],
  password: ['identity', 'access', 'credential'],
  login: ['identity', 'access'],
  sso: ['identity', 'access'],
  compliance: ['grc', 'governance', 'audit', 'compliance'],
  audit: ['grc', 'compliance', 'audit'],
  migrate: ['migration', 'modernization', 'cloud'],
  migration: ['migration', 'lift', 'shift'],
  legacy: ['modernization', 'legacy', 'migration'],
  cost: ['finops', 'cost', 'optimization'],
  bill: ['finops', 'cost'],
  chatbot: ['generative', 'llm', 'assistant', 'conversational'],
  genai: ['generative', 'llm'],
  gpt: ['generative', 'llm'],
  llm: ['generative', 'llm'],
  agent: ['agentic', 'automation', 'assistant'],
  dashboard: ['bi', 'analytics', 'reporting', 'intelligence'],
  report: ['bi', 'analytics', 'reporting'],
  forecast: ['predictive', 'forecasting', 'demand'],
  predict: ['predictive', 'forecasting'],
  camera: ['vision', 'video', 'computer'],
  cctv: ['vision', 'video', 'surveillance'],
  document: ['document', 'intelligent', 'automation', 'nlp'],
  invoice: ['document', 'automation', 'payment', 'reconciliation'],
  backup: ['backup', 'recovery', 'disaster'],
  outage: ['resilience', 'observability', 'sre', 'monitoring'],
  monitor: ['observability', 'monitoring'],
  devops: ['devops', 'ci', 'cd', 'platform'],
  api: ['api', 'integration'],
  app: ['application', 'app', 'mobile'],
  mobile: ['mobile', 'app'],
  data: ['data', 'lakehouse', 'pipeline'],
  warehouse: ['lakehouse', 'warehouse', 'platform'],
  kubernetes: ['kubernetes', 'container', 'cloud', 'native'],
  network: ['network', 'sd', 'wan', 'connectivity'],
  zero: ['zero', 'trust'],
  patient: ['clinical', 'healthcare', 'patient'],
  student: ['education', 'learning', 'student'],
  maintenance: ['predictive', 'maintenance', 'asset'],
  energy: ['energy', 'utilities'],
  customer: ['customer', 'experience', 'cx'],
  personalisation: ['personalisation', 'personalization', 'recommendation'],
  personalization: ['personalisation', 'personalization', 'recommendation'],
};

const IND_HINTS = {
  'financial-services': ['bank', 'banking', 'fintech', 'insurance', 'insurer', 'lending', 'credit', 'payments', 'wealth', 'financial'],
  retail: ['retail', 'retailer', 'store', 'stores', 'shop', 'shops', 'outlets', 'supermarkets', 'ecommerce', 'commerce', 'grocery', 'supermarket', 'merchandising'],
  healthcare: ['hospital', 'clinic', 'healthcare', 'patient', 'clinical', 'health'],
  'life-sciences': ['pharma', 'pharmaceutical', 'biotech', 'lab', 'clinical trial'],
  manufacturing: ['factory', 'plant', 'manufacturing', 'production', 'industrial'],
  media: ['media', 'broadcast', 'publisher', 'streaming', 'newsroom'],
  'technology-software': ['saas', 'software company', 'startup', 'tech company'],
  education: ['school', 'university', 'education', 'student', 'campus', 'research'],
  telecommunications: ['telco', 'telecom', 'operator', '5g', 'network operator'],
  'gaming-and-esports': ['game', 'gaming', 'esports', 'player'],
  'professional-services': ['consulting', 'law firm', 'accounting', 'agency'],
  'public-sector': ['government', 'ministry', 'municipality', 'public sector', 'citizen', 'permit'],
  hospitality: ['hotel', 'hospitality', 'travel', 'tourism', 'resort'],
  logistics: ['logistics', 'warehouse', 'shipping', 'fleet', 'freight', 'distribution'],
  aviation: ['airline', 'airport', 'aviation', 'aircraft'],
  agriculture: ['farm', 'agriculture', 'crop', 'agri'],
  automotive: ['automotive', 'dealer', 'vehicle', 'car'],
  'construction-real-estate': ['construction', 'real estate', 'property', 'building'],
  'consumer-goods': ['fmcg', 'cpg', 'consumer goods', 'brand'],
  utilities: ['utility', 'utilities', 'grid', 'power', 'water', 'electricity', 'energy'],
  'oil-gas': ['oil', 'gas', 'refinery', 'upstream', 'pipeline'],
};
const CAT_HINTS = {
  SEC: ['security', 'secure', 'cyber', 'threat', 'identity', 'breach', 'ransomware', 'soc', 'zero trust', 'firewall', 'password', 'compliance'],
  CLD: ['cloud', 'aws', 'azure', 'migration', 'migrate', 'landing zone', 'finops', 'hybrid', 'disaster recovery'],
  AI: [' ai ', 'genai', 'generative', 'llm', 'chatbot', 'machine learning', ' ml ', 'vision', 'predict', 'agent', 'nlp'],
  DNA: ['data', 'analytics', 'dashboard', 'bi ', 'warehouse', 'lakehouse', 'report', 'governance', 'insight'],
  SW: ['app', 'software', 'devops', 'api', 'integration', 'mobile', 'platform engineering', 'low code', 'legacy'],
};
const PLAT_HINTS = { AWS: ['aws', 'amazon web services'], Azure: ['azure', 'microsoft cloud'], 'Google Cloud': ['gcp', 'google cloud'], 'On-premises': ['on prem', 'on premises', 'onprem', 'datacenter', 'data centre'], Hybrid: ['hybrid'] };
const REGION_HINTS = { UAE: ['uae', 'dubai', 'abu dhabi', 'emirates'], KSA: ['ksa', 'saudi', 'riyadh', 'jeddah'], GCC: ['gcc', 'gulf', 'qatar', 'kuwait', 'oman', 'bahrain'], India: ['india', 'mumbai', 'bangalore', 'delhi'], Africa: ['africa', 'nigeria', 'kenya', 'egypt'], EMEA: ['emea', 'europe'] };
const TYPE_HINTS = {
  service: ['service', 'implement', 'implementation', 'consultant', 'partner', 'managed', 'assessment', 'migrate for us'],
  product: ['product', 'software', 'licence', 'license', 'tool', 'platform'],
  accelerator: ['accelerator', 'quick start', 'quickstart', 'fast', 'pilot in weeks'],
};

function hits(hay, dict) {
  const out = [];
  // match whole words, and their simple plurals (bank -> banks, factory -> factories)
  const stemmed = ' ' + hay.trim().split(' ').map(stem).join(' ') + ' ';
  for (const [k, words] of Object.entries(dict))
    if (words.some((w) => hay.includes(norm(w)) || stemmed.includes(' ' + norm(w).trim().split(' ').map(stem).join(' ') + ' '))) out.push(k);
  return out;
}

// Understand a free-text question into structured conditions.
export function understand(q) {
  const hay = norm(q);
  const terms = tokens(q);
  const expanded = new Set(terms.map(stem));
  for (const t of terms) for (const s of SYN[t] || SYN[stem(t)] || []) expanded.add(stem(s));
  return {
    terms,
    expanded: [...expanded],
    industries: hits(hay, IND_HINTS),
    categories: hits(hay, CAT_HINTS),
    platforms: hits(hay, PLAT_HINTS),
    regions: hits(hay, REGION_HINTS),
    types: hits(hay, TYPE_HINTS),
  };
}

function scoreItem(it, u) {
  let s = 0;
  const why = [];
  const matched = [];
  for (const t of u.expanded) {
    if (t.length < 2) continue;
    const inTitle = it._title.includes(' ' + t);
    const inHay = inTitle || it._hay.includes(' ' + t);
    if (inTitle) s += 6;
    else if (inHay) s += 2;
    if (inHay) {
      // show the buyer's own word, not the stem
      const orig = u.terms.find((w) => stem(w) === t);
      if (orig) matched.push(orig);
    }
  }
  // reward covering more of what was asked
  const original = u.terms.map(stem);
  const covered = original.filter((t) => it._hay.includes(' ' + t)).length;
  if (original.length) s *= 0.6 + 0.8 * (covered / original.length);

  let indOk = false;
  if (u.industries.length) {
    if (it.i.some((x) => u.industries.includes(x))) {
      s += 8;
      indOk = true;
      why.push(`built for ${it._ind.find((_, i) => u.industries.includes(it.i[i])) || 'your industry'}`);
    } else if (it.i.includes('cross-industry')) {
      s += 2;
      why.push('works across industries');
    } else s *= 0.55;
  }
  if (u.categories.length) {
    if (u.categories.includes(it.c)) {
      s += 4;
      why.push(`a ${catLabel(it.c).toLowerCase()} solution`);
    } else s *= 0.8;
  }
  if (u.platforms.length && it.pl.some((p) => u.platforms.includes(p))) {
    s += 3;
    why.push(`runs on ${it.pl.filter((p) => u.platforms.includes(p)).join(' and ')}`);
  }
  if (u.regions.length && it.r.some((r) => u.regions.includes(r) || (r === 'GCC' && (u.regions.includes('UAE') || u.regions.includes('KSA'))))) {
    s += 2;
    why.push(`offered in ${it.r.join(', ')}`);
  }
  if (u.types.length && u.types.includes(it.y)) s += 2.5;
  return { s, why, matched: [...new Set(matched)], indOk };
}

export function match(q, opts = {}) {
  return matchU(understand(q), opts);
}

// match against an already-understood brief (the advisor fills slots itself)
export function matchU(u, { limit = 6, filter, boost } = {}) {
  const pool = filter ? catalogue.filter(filter) : catalogue;
  const scored = [];
  for (const it of pool) {
    const r = scoreItem(it, u);
    if (boost) r.s += boost(it, r) || 0;
    if (r.s > 4) scored.push({ it, ...r });
  }
  scored.sort((a, b) => b.s - a.s || a.it.t.localeCompare(b.it.t));
  // diversity: avoid three near-identical titles in a row
  const out = [];
  const seenTitles = new Set();
  for (const r of scored) {
    const key = r.it.t.toLowerCase();
    if (seenTitles.has(key) && out.length < limit - 1) continue;
    seenTitles.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  const top = out[0]?.s || 1;
  for (const r of out) {
    r.fit = r.s >= top * 0.75 && (r.indOk || !u.industries.length) ? 'strong' : 'partial';
    if (r.matched.length) r.why.unshift(`mentions ${r.matched.slice(0, 3).join(', ')}`);
  }
  return { u, picks: out, total: scored.length };
}

// ---------- catalogue filtering ----------
export function filterItems(state) {
  const u = state.q ? understand(state.q) : null;
  let rows = catalogue.filter(
    (it) =>
      (!state.type || it.y === state.type) &&
      (!state.cat.length || state.cat.includes(it.c)) &&
      (!state.ind.length || it.i.some((x) => state.ind.includes(x))) &&
      // "__none" is the "Not specified" bucket, so buyers can see what a filter would hide
      (!state.plat.length || it.pl.some((x) => state.plat.includes(x)) || (state.plat.includes('__none') && !it.pl.length)) &&
      (!state.reg.length || it.r.some((x) => state.reg.includes(x)) || (state.reg.includes('__none') && !it.r.length)) &&
      (!state.prov || it.p === state.prov) &&
      (!state.sub || it.sc.includes(state.sub)) &&
      (!state.buy || it.aws),
  );
  let scores = null;
  if (u && u.expanded.length) {
    scores = new Map();
    rows = rows.filter((it) => {
      const termsHit = u.expanded.filter((t) => it._hay.includes(' ' + t)).length;
      if (!termsHit) return false;
      scores.set(it.id, scoreItem(it, { ...u, industries: [], categories: [], platforms: [], regions: [], types: [] }).s);
      return true;
    });
  }
  const sort = state.sort || (scores ? 'relevance' : 'az');
  if (sort === 'relevance' && scores) rows.sort((a, b) => scores.get(b.id) - scores.get(a.id));
  else if (sort === 'new') rows.sort((a, b) => (b.u || '').localeCompare(a.u || ''));
  else if (sort === 'za') rows.sort((a, b) => b.t.localeCompare(a.t));
  else rows.sort((a, b) => a.t.localeCompare(b.t));
  return { rows, terms: u?.terms || [] };
}

// count facet values over a set of rows
export function facetCounts(rows) {
  const c = { type: {}, cat: {}, ind: {}, plat: {}, reg: {}, sub: {}, prov: {} };
  const add = (o, k) => (o[k] = (o[k] || 0) + 1);
  for (const it of rows) {
    add(c.type, it.y);
    add(c.cat, it.c);
    add(c.prov, it.p);
    for (const x of it.i) add(c.ind, x);
    for (const x of it.sc) add(c.sub, x);
    if (it.pl.length) for (const x of it.pl) add(c.plat, x);
    else add(c.plat, '__none');
    if (it.r.length) for (const x of it.r) add(c.reg, x);
    else add(c.reg, '__none');
  }
  return c;
}

// ---------- guided discovery ----------
export const DISCOVERY = {
  industries: ['retail', 'financial-services', 'healthcare', 'manufacturing', 'public-sector', 'telecommunications', 'logistics', 'education', 'media', 'hospitality', 'utilities', 'oil-gas'],
  roles: [
    { key: 'exec', label: 'Business leader', hint: 'CEO, GM, head of a business unit', words: 'strategy growth' },
    { key: 'cio', label: 'Technology leader', hint: 'CIO, CTO, head of IT', words: 'platform modernization' },
    { key: 'ops', label: 'Operations', hint: 'COO, operations or supply chain', words: 'operations efficiency' },
    { key: 'cx', label: 'Customer & marketing', hint: 'CMO, CX, digital', words: 'customer experience personalisation' },
    { key: 'risk', label: 'Risk & security', hint: 'CISO, risk, compliance', words: 'security compliance risk' },
    { key: 'data', label: 'Data & analytics', hint: 'CDO, analytics, BI', words: 'data analytics' },
  ],
  challenges: [
    { key: 'cx', label: 'Win and keep more customers', hint: 'Churn, loyalty, personalisation', q: 'customer retention churn personalisation loyalty experience' },
    { key: 'cost', label: 'Cut operating cost', hint: 'Automation, efficiency, waste', q: 'automation efficiency cost reduction process optimisation' },
    { key: 'forecast', label: 'Predict demand and plan better', hint: 'Forecasting, inventory, capacity', q: 'demand forecasting inventory planning predictive' },
    { key: 'secure', label: 'Reduce cyber risk', hint: 'Threats, identity, zero trust', q: 'security threat detection identity zero trust', cat: 'SEC' },
    { key: 'comply', label: 'Prove compliance', hint: 'Audit, governance, regulation', q: 'compliance governance audit regulatory grc' },
    { key: 'cloud', label: 'Move to the cloud', hint: 'Migration, landing zone, FinOps', q: 'cloud migration landing zone modernization finops', cat: 'CLD' },
    { key: 'data', label: 'Make sense of our data', hint: 'Platforms, BI, data quality', q: 'data platform analytics business intelligence governance', cat: 'DNA' },
    { key: 'ai', label: 'Put AI to work safely', hint: 'GenAI assistants, agents, vision', q: 'generative ai llm assistant agentic automation', cat: 'AI' },
    { key: 'modern', label: 'Modernise old systems', hint: 'Legacy apps, APIs, DevOps', q: 'legacy modernization application api integration devops', cat: 'SW' },
    { key: 'resilience', label: 'Stay up when things break', hint: 'Backup, DR, observability', q: 'backup disaster recovery resilience observability' },
  ],
};

export function discoverMatch({ industry, role, challenge }) {
  const ch = DISCOVERY.challenges.find((c) => c.key === challenge);
  const ro = DISCOVERY.roles.find((r) => r.key === role);
  const q = `${ch.q} ${ro.words}`;
  const u = understand(q);
  u.industries = [industry];
  u.categories = ch.cat ? [ch.cat] : [];
  const scored = catalogue
    .map((it) => ({ it, ...scoreItem(it, u) }))
    .filter((r) => r.s > 4)
    .sort((a, b) => b.s - a.s);
  const out = [];
  const seen = new Set();
  for (const r of scored) {
    if (seen.has(r.it.t)) continue;
    seen.add(r.it.t);
    out.push(r);
    if (out.length === 6) break;
  }
  const top = out[0]?.s || 1;
  for (const r of out) {
    r.fit = r.indOk && r.s >= top * 0.7 ? 'strong' : 'partial';
    if (r.matched.length) r.why.unshift(`covers ${r.matched.slice(0, 3).join(', ')}`);
  }
  return out;
}

// ---------- readiness across the six-stage path ----------
export function readiness(it, d) {
  const who = d && (d.audience?.length || d.roles?.length || d.orgSizes?.length);
  const defined = d && d.scope && (d.deliverables?.length || d.delivery);
  const effort = d && (d.effort || d.delivery?.weeks || it.db);
  const stages = [
    { key: 'explore', name: 'Explore', prog: 'RACE', sub: 'Discover the fit', ok: d && d.outcome && who ? 1 : 0.5, msg: ['Outcome and who it is for are published.', 'Summary published; who it is for is not yet stated.'] },
    { key: 'experience', name: 'Experience', prog: 'Experience Centres', sub: 'See it working', ok: 0, msg: ['', '', 'No demonstration or case study published yet.'] },
    { key: 'define', name: 'Define', prog: 'Blueprint Studios', sub: 'Agree the blueprint', ok: defined ? 1 : d?.scope ? 0.5 : 0, msg: ['Scope of work and deliverables are published.', 'Scope is partly published.', 'Scope is not yet published.'] },
    { key: 'build', name: 'Build', prog: 'Protoverse', sub: 'Prove it', ok: effort && it.pl.length ? 1 : effort ? 0.5 : 0, msg: ['Platforms and effort are published.', 'Effort is published; platforms are not stated.', 'Effort is not yet published.'] },
    { key: 'deploy', name: 'Deploy', prog: 'Tech Citadel / Marketplace', sub: 'Buy and deploy', ok: d && d.skus?.length ? 1 : 0.5, msg: ['Ways to buy are published.', 'Request a proposal to agree ways to buy.'] },
    { key: 'adopt', name: 'Adopt', prog: 'Adoption Factory', sub: 'Measure the value', ok: d && d.kpi ? 0.5 : 0, msg: ['', 'A success measure is published as an estimate.', 'No success measure yet.'] },
  ];
  for (const s of stages) s.text = s.ok === 1 ? s.msg[0] : s.ok === 0.5 ? s.msg[1] : s.msg[2] || s.msg[1];
  const pct = Math.round((stages.reduce((a, s) => a + s.ok, 0) / stages.length) * 100);
  return { stages, pct };
}

// ---------- provider logos ----------
// A provider name may be "Partner / Vendor"; each part can carry its own logo.
export function logoParts(name) {
  return String(name)
    .split(' / ')
    .map((p) => p.trim())
    .map((p) => ({ name: p, file: logos[p] ? `assets/logos/${logos[p]}` : null }));
}
export const hasLogo = (name) => logoParts(name).some((p) => p.file);

// per provider summary, computed once from the catalogue
let provCache = null;
export function providerStats() {
  if (provCache) return provCache;
  const m = new Map();
  for (const it of catalogue) {
    let r = m.get(it.p);
    if (!r) m.set(it.p, (r = { name: it.p, kind: it.k, n: 0, y: { product: 0, service: 0, accelerator: 0 }, c: {}, items: [] }));
    r.n++;
    r.y[it.y]++;
    r.c[it.c] = (r.c[it.c] || 0) + 1;
    r.items.push(it);
  }
  provCache = [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return provCache;
}
