/**
 * Drives the whole product in a real browser, as both sides of the
 * marketplace, against a real Postgres.
 *
 * This exists because unit tests kept passing while the product was unusable.
 * Three separate reported "bugs" in v1 turned out to be one root cause, and it
 * only became visible by signing up and trying to get work done. The two dead
 * ends that shipped in the first v2 push — a verified freelancer who could not
 * bid, and a verified client who could not hire — were both invisible in the
 * code and obvious within a minute of driving it.
 *
 * So the walk is the test. It signs up, onboards, verifies, posts, bids, hires,
 * funds escrow, messages, signs out and signs back in. If any of that breaks,
 * this fails.
 *
 *   BASE=http://localhost:3000 node e2e/walk.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const stamp = Date.now();
const CLIENT = { email: `client${stamp}@felicek.test`, pass: 'Passw0rd!2345', name: 'Casey Client' };
const FREE = { email: `free${stamp}@felicek.test`, pass: 'Passw0rd!2345', name: 'Fred Freelancer' };

/** A real 1x1 PNG. The upload downscales it on canvas, so any valid image
 *  exercises the same path. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const problems = [];
const note = (step, detail) => {
  problems.push(`[${step}] ${detail}`);
  console.log(`  ✗ ${step}: ${detail}`);
};
const ok = (step) => console.log(`  ✓ ${step}`);
const body = (page) => page.locator('body').innerText();

/**
 * Navigate, and wait for the content rather than the skeleton.
 *
 * Signed-in pages stream: Next sends `loading.tsx` immediately and the real
 * content when the queries finish. That is the point — it is what makes a
 * click feel instant — but it means `domcontentloaded` now fires while the
 * skeleton is on screen, and reading the page there sees placeholder boxes.
 * Waiting for the skeleton to detach is the honest "the page has loaded".
 */
async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

/** Waits for any streamed skeleton to be replaced by real content. Needed
 *  after a Server Action too: revalidatePath re-renders the page, and the
 *  skeleton comes back while it does. */
async function settle(page) {
  await page.locator('[data-loading]').waitFor({ state: 'detached', timeout: 20000 })
    .catch(() => {});
}

/**
 * A page that is wider than the window has escaped its container, and on a
 * phone that makes everything unusable — every fixed header slides, and the
 * user scrolls sideways to read one line. It is caused by content with no
 * break opportunity: a long unbroken string, a wide table, an image without a
 * max width. The profile below is deliberately given such a string.
 */
async function noOverflow(page, label) {
  const { doc, win } = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  if (doc - win > 2) note(label, `page is ${doc - win}px wider than the ${win}px viewport`);
}

/** Text with no spaces in it — the thing users actually type that breaks
 *  layouts. Kept in the walk so a regression is caught, not reported. */
const UNBREAKABLE =
  'rrrrrrrrrrrrrrrrrrrrrrrrrrwwwwwwwwwwwwwwwwwwwweeeeeeeeeeeeeeeeeeezar'.repeat(4);

/* Distinctive strings, so a leak is unambiguous: if any of these reaches a
   competitor's browser it can only have come from someone else's proposal. */
const SECRET_PITCH =
  `I would start with the state model, then build the five screens against `
  + `widget tests. CANARY-COVERLETTER-${stamp}`;
const SECRET_ATTACHMENT = `https://example.com/canary-attachment-${stamp}`;
const SECRET_BID = '$1,000';

/** Anything the browser reports is a failure, not noise. A 500 or an uncaught
 *  exception on a page nobody asserted against is still a broken page. */
function watch(page, label) {
  page.on('pageerror', (e) => note(label, `uncaught: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/favicon|ERR_CONNECTION|fonts\.googleapis/.test(text)) return;
    note(label, `console: ${text.slice(0, 180)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) note(label, `${r.status()} on ${new URL(r.url()).pathname}`);
  });
}

async function signUp(page, who, role) {
  await page.goto(`${BASE}/sign-up`, { waitUntil: 'domcontentloaded' });
  await page.locator(`input[value="${role}"]`).click({ force: true });
  await page.getByLabel('Name', { exact: true }).fill(who.name);
  await page.getByLabel('Email').fill(who.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(who.pass);
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL(/\/(onboarding|verify|dashboard)/, { timeout: 30000 })
    .catch(async () => note('sign-up', `stuck on ${page.url()} — ${(await body(page)).slice(0, 200)}`));
}

async function onboard(page, who, isFreelancer) {
  if (!/\/onboarding/.test(page.url())) {
    await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  }
  // Picking a photo opens the crop editor; the save is a second, deliberate
  // step, so the walk has to take it too.
  await page.locator('input[type=file]')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: /save photo/i })
    .click({ timeout: 15000 })
    .catch(async () => note('avatar', `the crop editor did not open — ${(await body(page)).slice(0, 200)}`));
  await page.waitForTimeout(2500);

  await page.getByLabel('Display name').fill(who.name);
  await page.getByLabel(isFreelancer ? 'Headline' : 'Company or role')
    .fill(isFreelancer
      ? 'Flutter developer building offline-first apps'
      : 'Head of Product at a logistics startup');
  await page.getByLabel('About').fill(
    'A profile written during an end-to-end walk of the product, long enough '
    + `to satisfy the minimum length the form asks for. ${UNBREAKABLE}`);
  await page.getByLabel('Location').fill('Dhaka, Bangladesh');
  await page.getByLabel(isFreelancer ? 'Category you work in' : 'Category you hire in')
    .selectOption('Development & IT');
  await page.getByLabel(isFreelancer ? 'Skills' : 'What you hire for')
    .fill('Flutter, TypeScript');
  if (isFreelancer) await page.getByLabel('Hourly rate').fill('$45');
  await page.getByRole('button', { name: /save and continue/i }).click();
  await page.waitForURL(/\/verify/, { timeout: 30000 })
    .catch(async () => note('onboarding', `did not reach /verify — ${(await body(page)).slice(0, 250)}`));
}

async function verify(page, nid) {
  if (!/\/verify/.test(page.url())) {
    await page.goto(`${BASE}/verify`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByLabel('Full name as printed').fill('Test Person');
  await page.getByLabel('NID number').fill(nid);
  await page.getByRole('button', { name: /submit document/i }).click();
  await page.waitForTimeout(1500);
  if (!/Received|Document received/i.test(await body(page))) {
    note('verify:document', (await body(page)).slice(0, 250));
  } else ok('document accepted');

  await page.getByRole('button', { name: /complete verification/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    .catch(async () => note('verify:deposit', `did not reach /dashboard — ${(await body(page)).slice(0, 250)}`));
}

const browser = await chromium.launch();

/* ── The document check must actually reject ───────────────────────────── */
console.log('\n=== DOCUMENT VALIDATION ===');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUp(page, { ...CLIENT, email: `bad${stamp}@felicek.test` }, 'CLIENT');
  await onboard(page, CLIENT, false);
  await page.getByLabel('Full name as printed').fill('Test Person');
  await page.getByLabel('NID number').fill('0012345678'); // district prefix 00 is not issued
  await page.waitForTimeout(700);
  if (/not issued/i.test(await body(page))) ok('an impossible NID is refused before submit');
  else note('validation', `bad NID accepted: ${(await body(page)).slice(0, 200)}`);
  await ctx.close();
}

/* ── Client ───────────────────────────────────────────────────────────── */
console.log('\n=== CLIENT ===');
const cctx = await browser.newContext();
const c = await cctx.newPage();
watch(c, 'client');
await signUp(c, CLIENT, 'CLIENT');    ok('signed up');
await onboard(c, CLIENT, false);      ok('profile saved');
await verify(c, '1985123456789');     ok('verified');
await settle(c);

let text = await body(c);
if (/Find work/i.test(text) && !/Post a job/i.test(text)) {
  note('client dashboard', 'shows the freelancer view');
} else ok('client dashboard is the hirer view');
if (!/Posting balance/i.test(text)) note('client dashboard', 'no posting balance shown');

for (const path of ['/talent', '/contracts', '/wallet', '/settings', '/messages', '/notifications']) {
  await open(c, path);
  if (/Something broke|Application error/i.test(await body(c))) note(`client ${path}`, 'crashed');
  await noOverflow(c, `client ${path}`);
}
ok('client visited every nav destination');

await open(c, `/jobs`);
if (!/Find talent/i.test(await body(c))) note('client /jobs', 'was not redirected to /talent');
else ok('client /jobs redirects to /talent');

await open(c, `/jobs/new`);
await c.getByLabel('Title').fill('Build a five-screen onboarding flow in Flutter');
await c.getByLabel('Category').selectOption('Development & IT');
await c.getByLabel('Description').fill(
  'We need a five-screen onboarding flow built and tested end to end. '
  + 'Deliverables are the screens, the state handling, and widget tests. '
  + 'Done means it runs on Android and iOS with the tests green.');
await c.getByLabel('Skills').fill('Flutter, TypeScript');
await c.getByLabel('Budget').fill('$1,200');

// Milestones are mandatory and must add up to the budget.
await c.getByLabel('Milestone 1 deliverable').fill('Designs signed off');
await c.getByLabel('Milestone 1 amount').fill('$400');
await c.getByRole('button', { name: /add milestone/i }).click();
await c.getByLabel('Milestone 2 deliverable').fill('Screens built and tested');
await c.getByLabel('Milestone 2 amount').fill('$800');
await c.getByRole('button', { name: /^post job$/i }).click();
await c.waitForURL((u) => /\/jobs\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith('/new'),
  { timeout: 30000 })
  .catch(async () => note('post job', `did not navigate — at ${c.url()} — ${(await body(c)).slice(0, 250)}`));
const jobUrl = c.url();
ok(`job posted: ${jobUrl.replace(BASE, '')}`);

await open(c, jobUrl.replace(BASE, ''));
text = await body(c);
if (!/Designs signed off/.test(text) || !/Screens built and tested/.test(text)) {
  note('milestones', `not shown on the job — ${text.slice(0, 250)}`);
} else ok('milestones listed on the job');

/* ── Freelancer ───────────────────────────────────────────────────────── */
console.log('\n=== FREELANCER ===');
const fctx = await browser.newContext();
const f = await fctx.newPage();
watch(f, 'freelancer');
await signUp(f, FREE, 'FREELANCER');  ok('signed up');
await onboard(f, FREE, true);         ok('profile saved');
await verify(f, '1990123456789');     ok('verified');

if (/Post a job/i.test(await body(f))) note('freelancer dashboard', 'shows the hirer view');
else ok('freelancer dashboard is the freelancer view');

await open(f, `/talent`);
if (!/Find work/i.test(await body(f))) note('freelancer /talent', 'was not redirected to /jobs');
else ok('freelancer /talent redirects to /jobs');

await open(f, `/jobs`);
text = await body(f);
if (!/onboarding flow/i.test(text)) {
  note('find work', `the posted job is not listed — ${text.slice(0, 220)}`);
} else {
  ok('posted job appears on the board');
  const pct = text.match(/(\d+)% match/);
  if (!pct) note('match', 'no match score shown on the job card');
  else if (Number(pct[1]) < 95) note('match', `a perfect skills match scored only ${pct[1]}%`);
  else ok(`match score ${pct[1]}% clears the 95% floor`);
}

await open(f, jobUrl.replace(BASE, ''));
const bid = f.getByLabel('Your price');
if (!(await bid.count())) {
  note('bid', `no bid form for a verified freelancer — ${(await body(f)).slice(0, 250)}`);
} else {
  await bid.fill(SECRET_BID);
  await f.getByLabel('Your approach').fill(SECRET_PITCH);
  await f.getByLabel('Delivery time').fill('14');
  await f.getByLabel('Attachment').fill(SECRET_ATTACHMENT);
  await f.getByRole('button', { name: /submit proposal/i }).click();
  await f.waitForTimeout(2000);
  // Assert the stored proposal rather than the toast: the action revalidates
  // the page, which re-renders the form and clears its own success state.
  await open(f, jobUrl.replace(BASE, ''));
  text = await body(f);
  if (!text.includes(SECRET_PITCH.slice(0, 40)) || !text.includes(SECRET_BID)) {
    note('bid', `the bidder cannot read back their own proposal — ${text.slice(0, 250)}`);
  } else ok('proposal submitted, and its author can read it back');
}

/* ── Seeded sample jobs, and the category filter ───────────────────────── */
console.log('\n=== SAMPLE DATA ===');
{
  // Present only when the database was seeded; CI always seeds, a developer
  // running the walk by hand may not have.
  await open(f, '/jobs?match=0');
  const all = await body(f);
  if (!/Automated ETL pipeline/.test(all)) {
    ok('no sample data in this database — skipping the seed checks');
  } else {
    const titles = [
      'Automated ETL pipeline', 'Real-time streaming data pipeline',
      'PostgreSQL query optimisation', 'RLHF and red-teaming audit',
      'RAG pipeline benchmarking', 'Paper reproduction',
      'Customer churn prediction', 'Interactive financial forecasting',
      'Fine-tune a PyTorch vision transformer', 'Production RAG assistant',
      'LLM fine-tuning and evaluation', 'Recommender system rebuild',
      'Speech recognition pipeline', 'MLOps: get three PyTorch models',
    ];
    const missing = titles.filter((t) => !all.includes(t));
    if (missing.length) note('sample data', `not on the board: ${missing.join(', ')}`);
    else ok(`all ${titles.length} sample jobs appear on the board`);

    // Completed contracts exist so the profiles have a history. They must not
    // be sitting on the board as work somebody can still bid on.
    if (/Surface finish classification|Redshift to Snowflake migration/.test(all)) {
      note('sample data', 'a completed contract is showing as open work');
    } else ok('completed contracts stay off the open board');

    for (const [category, expected] of [
      ['Data Engineering', 3],
      ['AI Research & Evaluation', 3],
      ['Data Science & Analytics', 2],
      ['AI & Machine Learning', 6],
    ]) {
      await open(f, `/jobs?match=0&category=${encodeURIComponent(category)}`);
      const text = await body(f);
      const n = titles.filter((t) => text.includes(t)).length;
      if (n !== expected) note('category filter', `${category} showed ${n}, expected ${expected}`);
      else ok(`category filter: ${category} → ${n} jobs`);
    }

    // A milestone breakdown and a duration are what make a post usable.
    await open(f, '/jobs?match=0&category=' + encodeURIComponent('Data Engineering'));
    await f.getByRole('link', { name: /Automated ETL pipeline/ }).first().click();
    // Wait for the detail route, not just for the click to return. Four of the
    // five things checked below — the skills, the budget, the duration — also
    // appear on the card that was clicked, so reading too early passed on the
    // listing page and only "Source audit" gave it away. An assertion that can
    // be satisfied by the page you navigated *from* is not an assertion.
    await f.waitForURL(/\/jobs\/[^/?]+$/, { timeout: 20000 })
      .catch(() => note('sample job detail', `click did not navigate — still ${f.url()}`));
    await settle(f);
    await f.getByRole('heading', { level: 1, name: /Automated ETL pipeline/ })
      .waitFor({ timeout: 20000 })
      .catch(() => note('sample job detail', 'the job title never rendered'));

    const detail = await body(f);
    const needs = ['Airflow', 'Snowflake', 'Source audit', '45 days', '$4,800'];
    const absent = needs.filter((n) => !detail.includes(n));
    if (absent.length) note('sample job detail', `missing ${absent.map((n) => `"${n}"`).join(', ')}`);
    else ok('a sample job shows its skills, duration, budget and milestones');

    // Seeded people, and the track record that comes from released escrow.
    await open(f, '/profile/sample-arif-hossain');
    // Lower-cased because innerText returns *rendered* text, and these labels
    // are uppercased in CSS — matching "Jobs completed" against "JOBS
    // COMPLETED" failed on a heading that was on screen the whole time.
    const person = (await body(f)).toLowerCase();
    for (const [label, probe] of [
      ['the seeded freelancer has a profile', 'computer vision engineer'],
      ['their reviews are readable', 'what clients said'],
      ['their completed work is counted', 'jobs completed'],
      ['their earnings are shown', 'earned on felicek'],
    ]) {
      if (person.includes(probe)) ok(label);
      else note('seeded profile', `missing "${probe}"`);
    }
  }
}

/* ── The public job board: readable with no account at all ─────────────── */
console.log('\n=== PUBLIC BROWSE ===');
{
  // A fresh context with no cookies. Everything below has to work for someone
  // who has never signed up, which is the whole point of these pages.
  const ctx = await browser.newContext();
  const v = await ctx.newPage();
  watch(v, 'visitor');

  await v.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded' });
  const list = await body(v);
  if (/sign in|log in to continue/i.test(await v.title())) {
    note('browse', 'a signed-out visitor was bounced to sign-in');
  } else ok('a signed-out visitor can read the job board');

  if (!/Fine-tune a PyTorch vision transformer/.test(list)) {
    ok('no sample data in this database — skipping the public board checks');
  } else {
    ok('open work is listed publicly');

    await v.goto(`${BASE}/browse?category=${encodeURIComponent('AI & Machine Learning')}`,
      { waitUntil: 'domcontentloaded' });
    const filtered = await body(v);
    if (/Automated ETL pipeline/.test(filtered)) {
      note('browse', 'the category filter let a Data Engineering job through');
    } else ok('the public category filter holds');

    await v.goto(`${BASE}/browse/sample-pytorch-vit-defect-detection`,
      { waitUntil: 'domcontentloaded' });
    const one = await body(v);
    const html = await v.content();

    for (const [label, probe] of [
      ['the description is public', '90,000 labelled images'],
      ['the milestones are public', 'Data review, baseline'],
      ['the budget is public', '$5,800'],
      ['the proposal count is public', 'proposals so far'],
    ]) {
      if (one.includes(probe)) ok(label);
      else note('public job', `missing "${probe}"`);
    }

    // The seeded bids on this job are real Proposal rows. None of them may
    // reach a page that anyone on the internet can read — not in the text and
    // not in the RSC payload underneath it.
    for (const [what, probe] of [
      ['a cover letter', 'I have done this exact shape'],
      ['a bid amount', '$5,600'],
      ['a bidder’s name', 'Arif Hossain'],
    ]) {
      if (html.includes(probe)) note('public job', `${what} is exposed to the public`);
      else ok(`${what} is not exposed to the public`);
    }

    // A closed job must not stay on a page that advertises available work.
    // Fetched rather than navigated to: rendering a 404 logs a console error,
    // and the watcher would report this deliberate one as a failure.
    const gone = await v.request.get(`${BASE}/browse/sample-past-vision-yield-inspection`);
    if (gone.status() !== 404) {
      note('public job', `a completed contract is still listed as open work (${gone.status()})`);
    } else ok('completed contracts are not served as open work');
  }
  await ctx.close();
}

/* ── Fundraising: publish a raise, back one, and get the money back ────── */
console.log('\n=== STARTUPS ===');
{
  // A signed-out visitor first. The listing and a raise have to be readable
  // with no account, the same as the job board.
  const ctx = await browser.newContext();
  const v = await ctx.newPage();
  watch(v, 'visitor:startups');
  await v.goto(`${BASE}/startups`, { waitUntil: 'domcontentloaded' });
  const list = await body(v);
  if (/sign in/i.test(await v.title())) note('startups', 'a visitor was bounced to sign-in');
  else ok('a signed-out visitor can read the raises');

  // The thing that must never be missing from this page.
  if (/buys no equity/i.test(list)) ok('the no-equity statement is on the listing');
  else note('startups', 'the listing does not say a pledge buys no equity');

  const raiseLink = () => [...document.querySelectorAll('a[href^="/startups/"]')]
    .map((a) => a.getAttribute('href'))
    .find((h) => h !== '/startups/new');
  const href = await v.evaluate(raiseLink);
  if (!href) {
    ok('no sample raises in this database — skipping the rest');
  } else {
    await v.goto(BASE + href, { waitUntil: 'domcontentloaded' });
    const one = await body(v);
    const html = await v.content();
    for (const [label, probe] of [
      ['the pitch is public', 'What the money is for'],
      ['the backers are public', 'backer'],
      ['what backing means is stated', 'refunded in full'],
      ['no equity, said again on the raise', 'no equity'],
    ]) {
      if (new RegExp(probe, 'i').test(one)) ok(label);
      else note('startups', `missing "${probe}"`);
    }
    // A backer's private note to the founder must not reach a public page.
    if (/note to the founder/i.test(html) && !/sign|pledge/i.test(html)) {
      note('startups', 'a backer note may be exposed publicly');
    } else ok('backer notes are not on the public page');
  }
  await ctx.close();

  // Now the money. The client backs a raise and the balance actually moves.
  await open(c, '/startups');
  const target = await c.evaluate(() => [...document.querySelectorAll('a[href^="/startups/"]')]
    .map((a) => a.getAttribute('href'))
    .find((h) => h !== '/startups/new'));
  if (!target) {
    ok('no sample raises — skipping the pledge');
  } else {
    await open(c, '/wallet');
    const before = (await body(c)).match(/\$[\d,]+(?:\.\d\d)?/g)?.[0] ?? '?';

    await open(c, target);
    const amountField = c.locator('input[name="amount"]');
    if (!(await amountField.count())) {
      note('startups', 'a verified client is offered no way to back a raise');
    } else {
      await amountField.fill('$25');
      await c.locator('textarea[name="note"]').fill(
        'Backing this during an end-to-end walk of the product. '
        + `CANARY-PLEDGENOTE-${stamp}`);
      await c.getByRole('button', { name: /back this startup/i }).click();
      await c.waitForTimeout(2000);
      await settle(c);

      await open(c, target);
      const after = await body(c);
      if (/already pledged/i.test(after)) ok('the pledge was recorded');
      else note('startups', `no pledge showed after backing — ${after.slice(0, 200)}`);

      // The ledger is the check that matters: a progress bar can be wrong,
      // a debit cannot.
      await open(c, '/wallet');
      const ledger = await body(c);
      if (/pledge held/i.test(ledger)) ok('the pledge is on the ledger as held');
      else note('startups', `no pledge line on the ledger (balance was ${before})`);
    }

    // The note a backer wrote is for the founder, and for nobody browsing.
    const ctx2 = await browser.newContext();
    const stranger = await ctx2.newPage();
    await stranger.goto(BASE + target, { waitUntil: 'domcontentloaded' });
    if ((await stranger.content()).includes(`CANARY-PLEDGENOTE-${stamp}`)) {
      note('startups', 'a backer note leaked to a signed-out visitor');
    } else ok('the backer note stays private to the founder');
    await ctx2.close();
  }
}

/* ── Privacy: a competitor must not be able to read another bid ────────── */
console.log('\n=== PROPOSAL PRIVACY ===');
{
  const rival = {
    email: `rival${stamp}@felicek.test`, pass: 'Passw0rd!2345', name: 'Rival Freelancer',
  };
  const ctx = await browser.newContext();
  const r = await ctx.newPage();
  watch(r, 'rival');
  await signUp(r, rival, 'FREELANCER');
  await onboard(r, rival, true);
  await verify(r, '1993123456789');

  await open(r, jobUrl.replace(BASE, ''));
  const seen = await body(r);
  const html = await r.content();

  // Rendered text and raw HTML both: a field can leak through a hidden input,
  // a data attribute or the RSC payload without ever appearing on screen.
  for (const [what, needle] of [
    ['cover letter', `CANARY-COVERLETTER-${stamp}`],
    ['attachment URL', `canary-attachment-${stamp}`],
  ]) {
    if (seen.includes(needle)) note('privacy', `a competitor can read the ${what}`);
    else if (html.includes(needle)) note('privacy', `the ${what} is in the HTML payload`);
    else ok(`the ${what} is not exposed to a competitor`);
  }
  // The amount is a number, so check it did not render as a price anywhere.
  if (/\$1,000/.test(seen)) note('privacy', 'a competitor can read the bid amount');
  else ok('the bid amount is not exposed to a competitor');
  if (/14 days/.test(seen)) note('privacy', 'a competitor can read the delivery estimate');
  else ok('the delivery estimate is not exposed to a competitor');

  // But the aggregate and the applicant's identity are meant to be visible.
  if (!/Proposals \(1\)/.test(seen)) note('privacy', 'the proposal count is not shown');
  else ok('the proposal count is still public');
  if (!/Fred Freelancer/.test(seen)) note('privacy', 'who applied is not shown');
  else ok('who applied is still public');

  // And the rival's own bid must be fully visible to the rival.
  const rivalBid = r.getByLabel('Your price');
  if (await rivalBid.count()) {
    await rivalBid.fill('$1,200');
    await r.getByLabel('Your approach').fill(
      'A second proposal, written to check that a bidder can still read their own.');
    await r.getByRole('button', { name: /submit proposal/i }).click();
    await r.waitForTimeout(2000);
    await open(r, jobUrl.replace(BASE, ''));
    const after = await body(r);
    if (!/\$1,200/.test(after)) note('privacy', 'a bidder cannot see their own bid');
    else ok('a bidder still sees their own proposal in full');
    if (/CANARY-COVERLETTER/.test(after)) note('privacy', 'rival now sees the other cover letter');
  } else note('privacy', 'the rival could not bid');

  // The job board must not carry proposal contents either.
  await open(r, '/jobs');
  const boardHtml = await r.content();
  if (boardHtml.includes(`CANARY-COVERLETTER-${stamp}`) || /\$1,000/.test(await body(r))) {
    note('privacy', 'the job board leaks proposal contents');
  } else ok('the job list carries no proposal contents');

  await ctx.close();
}

/* ── Owner still sees everything ───────────────────────────────────────── */
await open(c, jobUrl.replace(BASE, ''));
{
  const ownerSees = await body(c);
  if (!ownerSees.includes(`CANARY-COVERLETTER-${stamp}`)) {
    note('privacy', 'the job owner cannot read the cover letter on their own job');
  } else ok('the job owner reads every proposal in full');
  if (!/\$1,000/.test(ownerSees)) note('privacy', 'the owner cannot see the bid amount');
  else ok('the owner sees bid amounts');
}

/* ── Authorship: how the writing got here, not what it reads like ──────── */
console.log('\n=== AUTHORSHIP ===');
{
  // The freelancer's bio was entered into the form during onboarding, so their
  // own profile should say so. `self` wording, because the person who wrote it
  // sees the same note the client does — that is the design, not a detail.
  await open(f, '/settings');
  const me = (await body(f)).match(/Username\s*\n?@([a-z0-9-]+)/)?.[1];
  if (!me) {
    note('authorship', 'could not read the freelancer username from settings');
  } else {
    await open(f, `/profile/${me}`);
    const own = await body(f);
    if (/Shown to readers: typed here/i.test(own)) ok('a typed bio is reported as typed');
    else note('authorship', `own bio not marked as typed — ${own.slice(0, 200)}`);

    // The client reads the same thing without the second-person wording.
    await open(c, `/profile/${me}`);
    const seenByClient = await body(c);
    if (/Typed here/i.test(seenByClient) && !/Shown to readers/i.test(seenByClient)) {
      ok('the client sees the same note, worded for a reader');
    } else note('authorship', 'the client does not see the bio note');
  }

  // Now the pasted path, on a seeded job. A real paste event, so the capture
  // sees what it would see from a person using the clipboard.
  const PASTED = 'Thank you for considering my proposal for this exciting '
    + 'opportunity. I bring extensive experience in machine learning, computer '
    + 'vision and model deployment to every engagement. My approach is '
    + 'methodical and transparent, ensuring stakeholders remain informed at '
    + 'every stage of the project. First I would conduct a thorough assessment '
    + 'of your existing data and establish clear evaluation criteria aligned '
    + 'with your business objectives.';

  await open(f, '/jobs/sample-pytorch-vit-defect-detection');
  if (!(await f.locator('textarea[name="note"]').count())) {
    ok('no sample data in this database — skipping the paste check');
  } else {
    await f.locator('input[name="bid"]').fill('$5,500');
    await f.evaluate((text) => {
      const ta = document.querySelector('textarea[name="note"]');
      ta.focus();
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      ta.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dt, bubbles: true, cancelable: true,
      }));
      // A synthetic paste event does not insert the text itself.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, text);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.blur();
    }, PASTED);

    const captured = await f.evaluate(
      () => document.querySelector('input[name="note__provenance"]')?.value);
    const parsed = captured ? JSON.parse(captured) : {};
    if (parsed.pasted > 0 && parsed.typed === 0) ok('a paste is recorded as a paste');
    else note('authorship', `paste not captured — ${captured}`);

    await f.locator('input[name="timelineDays"]').fill('40').catch(() => {});
    await f.getByRole('button', { name: /send|submit|proposal|bid/i }).first().click();
    await f.waitForTimeout(1500);
    await settle(f);

    await open(f, '/jobs/sample-pytorch-vit-defect-detection');
    const afterPaste = await body(f);
    if (/pasted/i.test(afterPaste)) ok('a pasted proposal is reported as pasted');
    else note('authorship', 'the pasted proposal carries no note');

    // The whole point of the fairness argument: nothing about how the text
    // *reads* may reach a reader. If this string ever appears, the style model
    // has been switched on and the eval gate has been ignored.
    if (/AI-generated|likely AI|machine-generated|\d+% AI/i.test(afterPaste)) {
      note('authorship', 'a style verdict is being shown to a reader');
    } else ok('no style verdict is shown to anyone');
  }
}

/* ── Hiring, which is where the money moves ───────────────────────────── */
console.log('\n=== HIRE ===');

/** The posting balance as a number, read off the stat rather than the page
 *  text — the page has several money figures on it. */
async function postingBalance(page) {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('p')]
      .find((el) => /posting balance/i.test(el.textContent ?? ''));
    const value = label?.nextElementSibling?.textContent ?? '';
    return Number(value.replace(/[^0-9.]/g, '')) || 0;
  });
}

await open(c, `/wallet`);
const topUp = c.getByRole('button', { name: /add \$1,000/i });
if (!(await topUp.count())) note('top up', 'no way to add to the posting balance');
else {
  // Relative, not absolute. This used to assert exactly $1,050 — $50 opening
  // balance plus the top-up — and broke the moment backing a startup could
  // also spend the posting balance earlier in the walk. What the top-up
  // promises is "+$1,000", so that is what to check.
  const before = await postingBalance(c);
  await topUp.click();
  await c.waitForTimeout(2500);
  await open(c, '/wallet');
  const after = await postingBalance(c);
  if (Math.round(after - before) !== 1000) {
    note('top up', `posting balance went ${before} → ${after}, expected +1000`);
  } else ok(`posting balance topped up by $1,000`);
}

await open(c, jobUrl.replace(BASE, ''));
text = await body(c);
if (!/Fred Freelancer/i.test(text)) {
  note('proposals', `the owner cannot see the bid — ${text.slice(0, 250)}`);
} else {
  ok('owner sees the proposal');
  const hire = c.getByRole('button', { name: /^hire /i });
  if (!(await hire.count())) note('hire', 'no hire button');
  else {
    await hire.first().click();
    await c.waitForTimeout(3000);
    if (/you are \$[\d,.]+ short/i.test(await body(c))) {
      note('hire', 'refused for insufficient posting balance');
    } else {
      await open(c, jobUrl.replace(BASE, ''));
      text = await body(c);
      if (!/filled/i.test(text) || !/in escrow/i.test(text)) {
        note('hire', `escrow not funded — ${text.slice(0, 250)}`);
      } else ok('hired, first milestone funded into escrow');
    }
  }
}

/* ── What the hire should have set in motion ──────────────────────────── */
console.log('\n=== AFTER THE HIRE ===');
await open(f, `/notifications`);
if (!/hired/i.test(await body(f))) note('notifications', 'the freelancer was not told');
else ok('freelancer notified');

await open(f, `/messages`);
if (!/Casey Client/i.test(await body(f))) {
  note('messages', 'no thread was opened on hire');
} else {
  ok('thread opened on hire');
  await f.getByRole('link', { name: /Casey Client/i }).first().click();
  await f.waitForURL(/\/messages\/[^/]+$/, { timeout: 20000 });
  await f.getByRole('textbox', { name: 'Message' })
    .fill('Thanks — starting on the state model today.');
  await f.getByRole('button', { name: /send message/i }).click();
  await f.waitForTimeout(2000);
  if (!/state model today/i.test(await body(f))) note('messages', 'the sent message did not appear');
  else ok('message sent and rendered');

  await open(c, `/messages`);
  if (!/state model today/i.test(await body(c))) note('messages', 'the client does not see it');
  else ok('client sees the reply');
}

await open(c, `/contracts`);
if (!/onboarding flow/i.test(await body(c))) note('contracts', 'missing for the client');
else ok('contract listed for the client');

await open(f, `/contracts`);
if (!/onboarding flow/i.test(await body(f))) note('contracts', 'missing for the freelancer');
else ok('contract listed for the freelancer');

await open(f, `/settings`);
const handle = (await body(f)).match(/Username\s*\n?@([a-z0-9-]+)/)?.[1];
if (!handle) note('profile view', 'could not read the freelancer username from settings');
else {
  await open(c, `/profile/${handle}`);
  if (!/Fred Freelancer/i.test(await body(c))) note('profile view', 'the client cannot read it');
  else ok('client can read the freelancer profile');
}

/* ── Milestones: fund and release, which is where money actually moves ── */
console.log('\n=== MILESTONES ===');
await open(c, jobUrl.replace(BASE, ''));
const release = c.getByRole('button', { name: /^release .* to the freelancer$/i });
if (!(await release.count())) {
  note('milestones', `no release button for the funded milestone — ${(await body(c)).slice(0, 250)}`);
} else {
  await release.first().click();
  await c.waitForTimeout(3000);
  await settle(c);
  if (!/released/i.test(await body(c))) note('milestones', 'the milestone did not release');
  else ok('first milestone released');

  await open(f, '/wallet');
  const wallet = await body(f);
  if (!/felicek fee/i.test(wallet)) note('fees', 'the 1% fee is not its own ledger row');
  else ok('release paid out with the fee itemised separately');
}

await open(c, jobUrl.replace(BASE, ''));
const fundNext = c.getByRole('button', { name: /^fund .* into escrow$/i });
if (!(await fundNext.count())) note('milestones', 'cannot fund the second milestone');
else {
  await fundNext.first().click();
  await c.waitForTimeout(3000);
  await settle(c);
  if (!/in escrow/i.test(await body(c))) note('milestones', 'second milestone did not fund');
  else ok('second milestone funded');
}

/* ── Navigation: the back button has to actually go back ──────────────── */
console.log('\n=== NAVIGATION ===');
{
  // Four pages used to bounce a signed-in visitor forward to the dashboard,
  // so pressing back landed on the dashboard again and the public home page
  // was unreachable without editing the address bar.
  const ctx = await browser.newContext();
  const nav = await ctx.newPage();
  const who = { ...CLIENT, email: `nav${stamp}@felicek.test`, name: 'Nav Tester' };
  await nav.goto(BASE, { waitUntil: 'domcontentloaded' });
  await nav.getByRole('link', { name: /^post a job$/i }).first().click();
  await nav.waitForURL(/sign-up/, { timeout: 20000 });
  await signUp(nav, who, 'CLIENT');
  await onboard(nav, who, false);
  await verify(nav, '1984123456789');

  let reachedHome = false;
  for (let i = 0; i < 6; i++) {
    await nav.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await nav.waitForTimeout(900);
    if (new URL(nav.url()).pathname === '/dashboard' && i > 0) {
      note('back button', 'a back press bounced forward to the dashboard again');
      break;
    }
    if (new URL(nav.url()).pathname === '/') { reachedHome = true; break; }
  }
  if (reachedHome) ok('back walks out to the home page without bouncing');
  else note('back button', 'never reached the home page by going back');

  await open(nav, '/dashboard');
  const homeLinks = await nav.locator('a[href="/"]').count();
  if (homeLinks === 0) note('navigation', 'no link to the home page anywhere in the app');
  else ok('the app links to the public home page');
  await ctx.close();
}

/* ── Sessions ─────────────────────────────────────────────────────────── */
console.log('\n=== SESSION ===');
await open(c, `/settings`);
await c.getByRole('button', { name: /^sign out$/i }).click();
await c.waitForURL(`${BASE}/`, { timeout: 20000 })
  .catch(() => note('sign out', 'did not land on the home page'));
await open(c, `/dashboard`);
if (!/\/sign-in/.test(c.url())) note('sign out', 'the dashboard is still reachable');
else ok('signed out and locked out');

await c.getByRole('textbox', { name: 'Email' }).fill(CLIENT.email);
await c.getByRole('textbox', { name: 'Password' }).fill(CLIENT.pass);
await c.getByRole('button', { name: /^log in$/i }).click();
await c.waitForURL(/\/dashboard/, { timeout: 30000 })
  .catch(async () => note('sign in', `did not reach the dashboard — ${(await body(c)).slice(0, 250)}`));
if (/\/dashboard/.test(c.url())) ok('signed back in');

await open(c, `/settings`);
await c.getByRole('button', { name: /^sign out$/i }).click();
await c.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
await c.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await c.getByRole('textbox', { name: 'Email' }).fill(CLIENT.email);
await c.getByRole('textbox', { name: 'Password' }).fill('definitely-not-the-password');
await c.getByRole('button', { name: /^log in$/i }).click();
await c.waitForTimeout(1500);
if (!/do not match/i.test(await body(c))) note('sign in', 'a wrong password produced no message');
else ok('a wrong password reports cleanly');

await browser.close();

console.log(`\n=== ${problems.length} PROBLEM(S) ===`);
for (const p of problems) console.log(p);
process.exit(problems.length ? 1 : 0);
