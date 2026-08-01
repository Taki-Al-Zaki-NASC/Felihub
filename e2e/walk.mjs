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
  await page.locator('input[type=file]')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForTimeout(2000);

  await page.getByLabel('Display name').fill(who.name);
  await page.getByLabel(isFreelancer ? 'Headline' : 'Company or role')
    .fill(isFreelancer
      ? 'Flutter developer building offline-first apps'
      : 'Head of Product at a logistics startup');
  await page.getByLabel('About').fill(
    'A profile written during an end-to-end walk of the product, long enough '
    + `to satisfy the minimum length the form asks for. ${UNBREAKABLE}`);
  await page.getByLabel('Location').fill('Dhaka, Bangladesh');
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

let text = await body(c);
if (/Find work/i.test(text) && !/Post a job/i.test(text)) {
  note('client dashboard', 'shows the freelancer view');
} else ok('client dashboard is the hirer view');
if (!/Posting balance/i.test(text)) note('client dashboard', 'no posting balance shown');

for (const path of ['/talent', '/contracts', '/wallet', '/settings', '/messages', '/notifications']) {
  await c.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  if (/Something broke|Application error/i.test(await body(c))) note(`client ${path}`, 'crashed');
  await noOverflow(c, `client ${path}`);
}
ok('client visited every nav destination');

await c.goto(`${BASE}/jobs`, { waitUntil: 'domcontentloaded' });
if (!/Find talent/i.test(await body(c))) note('client /jobs', 'was not redirected to /talent');
else ok('client /jobs redirects to /talent');

await c.goto(`${BASE}/jobs/new`, { waitUntil: 'domcontentloaded' });
await c.getByLabel('Title').fill('Build a five-screen onboarding flow in Flutter');
await c.getByLabel('Category').selectOption('Development & IT');
await c.getByLabel('Description').fill(
  'We need a five-screen onboarding flow built and tested end to end. '
  + 'Deliverables are the screens, the state handling, and widget tests. '
  + 'Done means it runs on Android and iOS with the tests green.');
await c.getByLabel('Skills').fill('Flutter, TypeScript');
await c.getByLabel('Budget').fill('$1,200');
await c.getByRole('button', { name: /^post job$/i }).click();
await c.waitForURL((u) => /\/jobs\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith('/new'),
  { timeout: 30000 })
  .catch(async () => note('post job', `did not navigate — at ${c.url()} — ${(await body(c)).slice(0, 250)}`));
const jobUrl = c.url();
ok(`job posted: ${jobUrl.replace(BASE, '')}`);

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

await f.goto(`${BASE}/talent`, { waitUntil: 'domcontentloaded' });
if (!/Find work/i.test(await body(f))) note('freelancer /talent', 'was not redirected to /jobs');
else ok('freelancer /talent redirects to /jobs');

await f.goto(`${BASE}/jobs`, { waitUntil: 'domcontentloaded' });
if (!/onboarding flow/i.test(await body(f))) note('find work', 'the posted job is not listed');
else ok('posted job appears on the board');

await f.goto(jobUrl, { waitUntil: 'domcontentloaded' });
const bid = f.getByLabel('Your price');
if (!(await bid.count())) {
  note('bid', `no bid form for a verified freelancer — ${(await body(f)).slice(0, 250)}`);
} else {
  await bid.fill('$1,000');
  await f.getByLabel('Your approach').fill(
    'I would start with the state model, then build the five screens against '
    + 'widget tests, and hand over with a walkthrough.');
  await f.getByRole('button', { name: /submit proposal/i }).click();
  await f.waitForTimeout(2000);
  text = await body(f);
  if (!/bid was sent/i.test(text) && !/Your bid/i.test(text)) {
    note('bid', `no confirmation — ${text.slice(0, 250)}`);
  } else ok('proposal submitted');
}

/* ── Hiring, which is where the money moves ───────────────────────────── */
console.log('\n=== HIRE ===');
await c.goto(`${BASE}/wallet`, { waitUntil: 'domcontentloaded' });
const topUp = c.getByRole('button', { name: /add \$1,000/i });
if (!(await topUp.count())) note('top up', 'no way to add to the posting balance');
else {
  await topUp.click();
  await c.waitForTimeout(2500);
  if (!/Added to your posting balance/i.test(await body(c))) note('top up', 'no confirmation');
  else ok('posting balance topped up');
}

await c.goto(jobUrl, { waitUntil: 'domcontentloaded' });
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
    text = await body(c);
    if (/you are \$[\d,.]+ short/i.test(text)) {
      note('hire', `refused: ${text.match(/[^.]*you are \$[\d,.]+ short[^.]*\./i)?.[0]}`);
    } else if (!/filled/i.test(text) || !/in escrow/i.test(text)) {
      note('hire', `escrow not funded — ${text.slice(0, 250)}`);
    } else ok('hired, escrow funded');
  }
}

/* ── What the hire should have set in motion ──────────────────────────── */
console.log('\n=== AFTER THE HIRE ===');
await f.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' });
if (!/hired/i.test(await body(f))) note('notifications', 'the freelancer was not told');
else ok('freelancer notified');

await f.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
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

  await c.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
  if (!/state model today/i.test(await body(c))) note('messages', 'the client does not see it');
  else ok('client sees the reply');
}

await c.goto(`${BASE}/contracts`, { waitUntil: 'domcontentloaded' });
if (!/onboarding flow/i.test(await body(c))) note('contracts', 'missing for the client');
else ok('contract listed for the client');

await f.goto(`${BASE}/contracts`, { waitUntil: 'domcontentloaded' });
if (!/onboarding flow/i.test(await body(f))) note('contracts', 'missing for the freelancer');
else ok('contract listed for the freelancer');

await f.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
const handle = (await body(f)).match(/Username\s*\n?@([a-z0-9-]+)/)?.[1];
if (!handle) note('profile view', 'could not read the freelancer username from settings');
else {
  await c.goto(`${BASE}/profile/${handle}`, { waitUntil: 'domcontentloaded' });
  if (!/Fred Freelancer/i.test(await body(c))) note('profile view', 'the client cannot read it');
  else ok('client can read the freelancer profile');
}

/* ── Sessions ─────────────────────────────────────────────────────────── */
console.log('\n=== SESSION ===');
await c.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
await c.getByRole('button', { name: /^sign out$/i }).click();
await c.waitForURL(`${BASE}/`, { timeout: 20000 })
  .catch(() => note('sign out', 'did not land on the home page'));
await c.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
if (!/\/sign-in/.test(c.url())) note('sign out', 'the dashboard is still reachable');
else ok('signed out and locked out');

await c.getByRole('textbox', { name: 'Email' }).fill(CLIENT.email);
await c.getByRole('textbox', { name: 'Password' }).fill(CLIENT.pass);
await c.getByRole('button', { name: /^log in$/i }).click();
await c.waitForURL(/\/dashboard/, { timeout: 30000 })
  .catch(async () => note('sign in', `did not reach the dashboard — ${(await body(c)).slice(0, 250)}`));
if (/\/dashboard/.test(c.url())) ok('signed back in');

await c.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
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
