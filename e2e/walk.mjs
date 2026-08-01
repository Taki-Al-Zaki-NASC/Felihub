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
await open(c, `/wallet`);
const topUp = c.getByRole('button', { name: /add \$1,000/i });
if (!(await topUp.count())) note('top up', 'no way to add to the posting balance');
else {
  await topUp.click();
  await c.waitForTimeout(2500);
  await open(c, '/wallet');
  // Assert the balance itself, not the toast: the Server Action revalidates
  // the page, which re-renders the form and can clear its own success state.
  // The number on screen is the fact; the message is decoration.
  if (!/\$1,050/.test(await body(c))) {
    note('top up', `posting balance did not increase — ${(await body(c)).slice(0, 200)}`);
  } else ok('posting balance topped up to $1,050');
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
