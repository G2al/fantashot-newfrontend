// Real auth-store + API client, isolated browser/storage and simulated HTTP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const profile = (name = 'Partner B') => ({ data: { user: { id: 2, name, username: 'partner', email: '' }, wallets: [] } });
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(setImmediate); };
function harness(url = 'https://frontend.test/', { denied = false, writeDenied = false } = {}) {
  class MemoryStorage {
    values = new Map();
    getItem(key) { return this.values.get(key) ?? null; }
    setItem(key, value) { if (writeDenied) throw new Error('Blocked'); this.values.set(key, value); }
    removeItem(key) { this.values.delete(key); }
  }
  const window = new EventTarget();
  window.location = new URL(url);
  const session = new MemoryStorage();
  const local = new MemoryStorage();
  Object.defineProperties(window, {
    sessionStorage: { get() { if (denied) throw new Error('Blocked'); return session; } },
    localStorage: { get() { if (denied) throw new Error('Blocked'); return local; } },
  });
  window.history = { replaceState(_state, _title, next) { window.location = new URL(next, window.location); } };
  const requests = [];
  const context = vm.createContext({ window, URLSearchParams, Event, CustomEvent, FormData, Date, process, fetch: (url, options) => new Promise((resolve, reject) => {
    requests.push({ url, options, reject, respond: (data, status = 200) => resolve({ ok: status < 400, status, text: async () => JSON.stringify(data) }) });
  }) });
  const modules = new Map();
  function load(name) {
    if (modules.has(name)) return modules.get(name).exports;
    const loadedModule = { exports: {} }; modules.set(name, loadedModule);
    const source = fs.readFileSync(path.join(import.meta.dirname, '..', name.replace('@/', '') + '.ts'), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(load, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const store = load('@/lib/auth-store');
  const unsubscribe = store.subscribeAuth(() => {});
  return { store, window, session, local, requests, load, unsubscribe };
}

test('no token: ready, no API request', () => {
  const h = harness(); h.store.initializeAuth();
  assert.equal(h.store.getAuthSnapshot().isReady, true);
  assert.equal(h.requests.length, 0);
});

test('capture decoded Sanctum token, scrub only token, deduplicate remount/Strict Mode', async () => {
  const h = harness('https://frontend.test/profile?keep=one&token=123%7Cfake&keep=two#wallet');
  h.store.initializeAuth(); h.store.initializeAuth(); h.unsubscribe(); h.store.subscribeAuth(() => {}); h.store.initializeAuth();
  assert.equal(h.window.location.href, 'https://frontend.test/profile?keep=one&keep=two#wallet');
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer 123|fake');
  assert.equal(h.requests[0].options.referrerPolicy, 'no-referrer');
  assert.equal(h.store.getAuthSnapshot().isReady, false);
  h.requests[0].respond(profile()); await flush();
  assert.equal(h.store.getAuthSnapshot().user.name, 'Partner B');
  assert.equal(h.store.getAuthSnapshot().launchNavigation, true);
  assert.equal(h.session.getItem('fantashot_auth_token'), '123|fake');
  assert.equal(h.local.getItem('fantashot_auth_token'), null);
});

test('raw | and duplicate token parameters are removed', () => {
  const h = harness('https://frontend.test/?token=1|fake&token=other&x=y#hash'); h.store.initializeAuth();
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer 1|fake');
  assert.equal(h.window.location.search, '?x=y');
});

for (const status of [401, 500]) test(`HTTP ${status} clears A and stops without retry loops`, async () => {
  const h = harness('https://frontend.test/?token=invalid');
  h.local.setItem('fantashot_auth_token', 'old');
  h.store.initializeAuth();
  assert.equal(h.store.getAuthSnapshot().user, null);
  h.requests[0].respond({ message: 'Do not expose backend error' }, status); await flush();
  h.store.initializeAuth();
  const state = h.store.getAuthSnapshot();
  assert.equal(state.token, null); assert.equal(state.isReady, true);
  assert.ok(state.error.includes(status === 401 ? 'app partner' : 'connessione'));
  assert.equal(state.error.includes('Do not expose'), false);
  assert.equal(h.requests.length, 1);
  assert.equal(h.local.getItem('fantashot_auth_token'), null);
});

test('network error ends waiting and never logs backend error', async () => {
  const h = harness('https://frontend.test/?token=network'); h.store.initializeAuth();
  h.requests[0].reject(new Error('sensitive request')); await flush();
  assert.equal(h.store.getAuthSnapshot().isReady, true);
  assert.match(h.store.getAuthSnapshot().error, /connessione/);
});

test('A authenticated, incoming B immediately hides A', async () => {
  const h = harness(); h.store.initializeAuth(); h.store.setAuth(profile('A').data.user, 'A', true);
  h.window.location = new URL('https://frontend.test/?token=B'); h.store.initializeAuth();
  assert.equal(h.store.getAuthSnapshot().user, null); assert.equal(h.store.getAuthSnapshot().token, null);
  h.requests[0].respond(profile('B')); await flush();
  assert.equal(h.store.getAuthSnapshot().user.name, 'B');
});

for (const failure of [false, true]) test(`late A ${failure ? 'failure' : 'success'} cannot overwrite B`, async () => {
  const h = harness('https://frontend.test/?token=A'); h.store.initializeAuth();
  h.window.location = new URL('https://frontend.test/?token=B'); h.store.initializeAuth();
  h.requests[1].respond(profile('B')); await flush();
  h.requests[0].respond(profile('A'), failure ? 401 : 200); await flush();
  assert.equal(h.store.getAuthSnapshot().token, 'B');
  assert.equal(h.store.getAuthSnapshot().user.name, 'B');
});

test('new token captured at response resolution wins before navigation effects', async () => {
  const h = harness('https://frontend.test/?token=A'); h.store.initializeAuth();
  h.window.location = new URL('https://frontend.test/?token=B');
  h.requests[0].respond(profile('A')); await flush();
  assert.equal(h.requests.length, 2); assert.equal(h.store.getAuthSnapshot().user, null);
  h.requests[1].respond(profile('B')); await flush();
  assert.equal(h.store.getAuthSnapshot().token, 'B');
});

test('logout during validation invalidates pending request', async () => {
  const h = harness('https://frontend.test/?token=A'); h.store.initializeAuth(); h.store.clearAuth();
  h.requests[0].respond(profile()); await flush();
  assert.equal(h.store.getAuthSnapshot().token, null);
});

for (const mode of [{ denied: true }, { writeDenied: true }]) test(`blocked storage ${JSON.stringify(mode)} uses memory`, async () => {
  const h = harness('https://frontend.test/?token=B', mode); h.store.initializeAuth();
  h.requests[0].respond(profile()); await flush();
  assert.equal(h.store.getAuthSnapshot().token, 'B'); assert.equal(h.store.getAuthSnapshot().memoryOnly, true);
  h.store.setUser(profile('Updated').data.user); h.store.clearAuth();
  assert.equal(h.store.getAuthSnapshot().token, null);
});

test('reload validates stored partner session before revealing profile', async () => {
  const h = harness(); h.session.setItem('fantashot_auth_token', 'stored'); h.session.setItem('fantashot_auth_partner', 'true');
  h.store.initializeAuth(); assert.equal(h.store.getAuthSnapshot().token, null);
  h.requests[0].respond({}, 401); await flush();
  assert.match(h.store.getAuthSnapshot().error, /app partner/);
  assert.equal(h.session.getItem('fantashot_auth_token'), null);
});

test('Remember me expiry is not renewed on reload, backend still validates', async () => {
  const h = harness(); const expiry = String(Date.now() + 100000);
  h.local.setItem('fantashot_auth_token', 'stored'); h.local.setItem('fantashot_auth_token_expiry', expiry);
  h.store.initializeAuth(); h.requests[0].respond(profile()); await flush();
  assert.equal(h.local.getItem('fantashot_auth_token_expiry'), expiry);
});

test('local Remember me expiry clears persistence without a refresh endpoint', () => {
  const h = harness(); h.local.setItem('fantashot_auth_token', 'stored'); h.local.setItem('fantashot_auth_token_expiry', '1');
  h.store.initializeAuth(); assert.equal(h.requests.length, 0); assert.equal(h.store.getAuthSnapshot().token, null);
});

test('401 for current token clears auth, 401 for old token leaves B intact', async () => {
  const h = harness(); h.store.initializeAuth(); h.store.setAuth(profile().data.user, 'B');
  const api = h.load('@/lib/api');
  const old = api.apiFetch('/me', { token: 'A' }).catch(() => {}); h.requests[0].respond({}, 401); await old;
  assert.equal(h.store.getAuthSnapshot().token, 'B');
  const current = api.apiFetch('/me', { token: 'B' }).catch(() => {}); h.requests[1].respond({}, 401); await current;
  assert.equal(h.store.getAuthSnapshot().token, null);
});

test('logout sends POST Bearer; subsequent unauthenticated request is rejected (simulated)', async () => {
  const h = harness(); h.store.initializeAuth(); h.store.setAuth(profile().data.user, 'B');
  const pending = h.load('@/lib/auth-api').logout('B');
  assert.equal(h.requests[0].options.method, 'POST'); assert.equal(h.requests[0].options.headers.Authorization, 'Bearer B');
  h.requests[0].respond({ message: 'Logged out' }); await pending; h.store.clearAuth();
  const next = h.load('@/lib/api').apiFetch('/me', { token: h.store.getAuthSnapshot().token });
  assert.equal(h.requests[1].options.headers.Authorization, undefined);
  h.requests[1].respond({}, 401); await assert.rejects(next, { status: 401 });
});
