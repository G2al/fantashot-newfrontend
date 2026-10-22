// Requires a running production build and Playwright. All API responses are simulated.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.AUTH_TEST_BASE_URL ?? 'http://localhost:3100';
let browser;
before(async () => {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
});
after(async () => { await browser?.close(); });

const A = '101|fixture-A';
const B = '102|fixture-B';
const user = (token) => ({ id: token === A ? 1 : 2, name: token === A ? 'Utente A' : 'Utente B', username: token === A ? 'utenteA' : 'utenteB', email: 'fixture@example.test' });
const me = (token) => ({ data: { user: user(token), wallets: [] } });
const waitFor = async (condition) => {
  for (let i = 0; i < 150; i++) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail('Expected browser condition was not reached');
};

async function setup(t, { storageDenied = false, stored = false, response = 'ok', hold = false, holdLogout = false } = {}) {
  const context = await browser.newContext();
  t.after(() => context.close());
  if (storageDenied) await context.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  if (stored) await context.addInitScript(({ token, user }) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('fantashot_auth_token', token);
      sessionStorage.setItem('fantashot_auth_user', JSON.stringify(user));
      sessionStorage.setItem('seeded', 'yes');
    }
  }, { token: A, user: user(A) });
  const requests = [];
  const revoked = new Set();
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  await context.route('**/api/v1/**', async route => {
    const req = route.request();
    const endpoint = new URL(req.url()).pathname.split('/api/v1')[1];
    const token = (req.headers().authorization ?? '').replace('Bearer ', '');
    requests.push({ endpoint, method: req.method(), token, referer: req.headers().referer });
    const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': base } });
    if (endpoint === '/me') {
      if (hold) await barrier;
      if (response === 'network') return route.abort('failed');
      if (response === 'server') return fulfill({ message: 'Unavailable' }, 500);
      if (response === 'invalid' || revoked.has(token) || !token) return fulfill({ message: 'Unauthenticated' }, 401);
      return fulfill(me(token));
    }
    if (endpoint === '/login') return fulfill({ token: B, success: 'success' });
    if (endpoint === '/register') return fulfill({ token: B, user: user(B), success: 'success' });
    if (endpoint === '/logout') {
      if (holdLogout) await barrier;
      revoked.add(token); return fulfill({ message: 'Logged out' });
    }
    if (endpoint === '/tournaments') return fulfill({ data: [], meta: { last_page: 1 } });
    return fulfill({ data: [] });
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', () => pageErrors.push('Browser runtime error'));
  page.on('console', message => {
    if ([A, B, encodeURIComponent(A), encodeURIComponent(B)].some(token => message.text().includes(token))) {
      pageErrors.push('Sensitive value in browser console');
    }
  });
  t.after(() => assert.deepEqual(pageErrors, []));
  return { context, page, requests, release, revoked };
}

test('valid launch: scrub URL while waiting, one /me, dashboard, reload and logout', async t => {
  const h = await setup(t, { hold: true });
  await h.page.goto(`${base}/?keep=yes&token=${encodeURIComponent(B)}#anchor`);
  await waitFor(() => h.requests.some(r => r.endpoint === '/me'));
  assert.equal(new URL(h.page.url()).search, '?keep=yes');
  assert.equal(new URL(h.page.url()).hash, '#anchor');
  assert.equal(await h.page.locator('header').count(), 0);
  assert.equal(h.requests[0].referer, undefined);
  h.release();
  await h.page.waitForURL('**/dashboard?keep=yes#anchor');
  await h.page.getByRole('button', { name: 'Menu profilo' }).waitFor();
  assert.equal(h.requests.filter(r => r.endpoint === '/me').length, 1);
  await h.page.reload();
  await h.page.getByRole('button', { name: 'Menu profilo' }).click();
  await h.page.getByRole('button', { name: 'Esci', exact: true }).click();
  await h.page.waitForURL('**/login');
  assert.ok(h.requests.some(r => r.endpoint === '/logout' && r.method === 'POST' && r.token === B));
  assert.equal(await h.page.evaluate(() => sessionStorage.getItem('fantashot_auth_token')), null);
  // The mock backend models revocation; this does not verify the real backend.
  const status = await h.page.evaluate(async token => (await fetch('https://api.fantashot.live/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })).status, B);
  assert.equal(status, 401);
});

for (const response of ['invalid', 'server', 'network']) test(`${response} launch shows a stable error, no redirect loop`, async t => {
  const h = await setup(t, { response });
  await h.page.goto(`${base}/?token=${encodeURIComponent(B)}`);
  await h.page.locator('p[role=alert]').waitFor();
  assert.equal(new URL(h.page.url()).search, '');
  assert.equal(h.requests.filter(r => r.endpoint === '/me').length, 1);
  if (response === 'invalid') {
    assert.match(await h.page.locator('p[role=alert]').innerText(), /app partner/);
    await h.page.screenshot({ path: path.join(tmpdir(), 'fantashot-auth-error.png') });
  }
  await h.page.getByRole('button', { name: 'Vai al login email e password' }).click();
  await h.page.waitForURL('**/login');
});

test('stored A is never rendered during launch B verification', async t => {
  const h = await setup(t, { stored: true, hold: true });
  await h.page.goto(`${base}/profile?token=${encodeURIComponent(B)}`);
  await waitFor(() => h.requests.some(r => r.endpoint === '/me'));
  assert.equal(await h.page.locator('body').innerText(), '');
  assert.equal(h.requests.filter(r => r.endpoint === '/me').length, 1);
  assert.equal(h.requests.find(r => r.endpoint === '/me').token, B);
  h.release(); await h.page.waitForURL('**/dashboard');
  await h.page.getByRole('button', { name: 'Menu profilo' }).click();
  await h.page.getByText('Utente B', { exact: true }).waitFor();
  assert.equal(await h.page.getByText('Utente A', { exact: true }).count(), 0);
});

test('no token keeps email/password login working', async t => {
  const h = await setup(t);
  await h.page.goto(base); await h.page.waitForURL('**/login');
  assert.equal(h.requests.filter(r => r.endpoint === '/me').length, 0);
  await h.page.locator('#email').fill('fixture@example.test');
  await h.page.locator('#password').fill('TestPassword123!');
  await h.page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await h.page.waitForURL('**/dashboard');
  assert.ok(h.requests.some(r => r.endpoint === '/login' && r.method === 'POST'));
});

test('blocked storage: memory login, visible reload warning, reload returns to login', async t => {
  const h = await setup(t, { storageDenied: true });
  await h.page.goto(`${base}/?token=${encodeURIComponent(B)}`);
  await h.page.waitForURL('**/dashboard');
  await h.page.getByText(/Lo storage del browser non è disponibile/).waitFor();
  await h.page.screenshot({ path: path.join(tmpdir(), 'fantashot-auth-memory.png') });
  await h.page.reload(); await h.page.waitForURL('**/login');
  await h.page.locator('#email').fill('fixture@example.test');
  await h.page.locator('#password').fill('TestPassword123!');
  await h.page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await h.page.waitForURL('**/dashboard');
});

test('registration still establishes auth and opens dashboard', async t => {
  const h = await setup(t);
  await h.page.goto(`${base}/register`);
  await h.page.locator('#full-name').fill('Test User');
  await h.page.locator('#username').fill('testuser');
  await h.page.locator('#email').fill('fixture@example.test');
  await h.page.locator('#password').fill('TestPassword123!');
  await h.page.locator('#password_confirmation').fill('TestPassword123!');
  await h.page.getByRole('button', { name: 'Crea account' }).click();
  await h.page.waitForURL('**/dashboard');
  assert.ok(h.requests.some(r => r.endpoint === '/register'));
});

test('client navigation token takes precedence over current user', async t => {
  const h = await setup(t);
  await h.page.goto(`${base}/?token=${encodeURIComponent(A)}`);
  await h.page.waitForURL('**/dashboard');
  await h.page.evaluate(token => history.pushState(null, '', `/profile?token=${encodeURIComponent(token)}&keep=1#anchor`), B);
  await h.page.waitForURL('**/dashboard?keep=1#anchor');
  await h.page.getByRole('button', { name: 'Menu profilo' }).click();
  await h.page.getByText('Utente B', { exact: true }).waitFor();
  assert.equal(h.requests.filter(r => r.endpoint === '/me').length, 2);
});

test('expired active partner session is cleared on the next protected request', async t => {
  const h = await setup(t);
  await h.page.goto(`${base}/?token=${encodeURIComponent(B)}`);
  await h.page.waitForURL('**/dashboard');
  await h.page.getByRole('button', { name: 'Menu profilo' }).waitFor();
  h.revoked.add(B);
  await h.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await h.page.locator('p[role=alert]').waitFor();
  assert.match(await h.page.locator('p[role=alert]').innerText(), /app partner/);
  assert.equal(await h.page.locator('header').count(), 0);
  assert.equal(await h.page.evaluate(() => sessionStorage.getItem('fantashot_auth_token')), null);
});

test('late logout from A cannot clear the new partner session B', async t => {
  const h = await setup(t, { holdLogout: true });
  await h.page.goto(`${base}/?token=${encodeURIComponent(A)}`);
  await h.page.waitForURL('**/dashboard');
  await h.page.getByRole('button', { name: 'Menu profilo' }).click();
  await h.page.getByRole('button', { name: 'Esci', exact: true }).click();
  await waitFor(() => h.requests.some(r => r.endpoint === '/logout'));
  await h.page.evaluate(token => history.pushState(null, '', `/?token=${encodeURIComponent(token)}`), B);
  await h.page.waitForURL('**/dashboard');
  await waitFor(() => h.requests.some(r => r.endpoint === '/me' && r.token === B));
  const logoutResponse = h.page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/logout'));
  h.release(); await logoutResponse;
  await h.page.getByRole('button', { name: 'Menu profilo' }).click();
  await h.page.getByText('Utente B', { exact: true }).waitFor();
  assert.equal(new URL(h.page.url()).pathname, '/dashboard');
  assert.equal(await h.page.evaluate(() => sessionStorage.getItem('fantashot_auth_token')), B);
});
