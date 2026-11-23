import assert from 'node:assert/strict';
import worker from '../worker/index.js';

let usedKey;
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://platform.liner.com/api/v1/credits/balance');
  usedKey = options.headers['x-api-key'];
  if (usedKey === 'bad-key') return Response.json({}, { status: 401 });
  return Response.json({ balance_usd: '0.000000', balance: 0, currency: 'USD' });
};
async function check(key, env = { LINER_API_KEY: 'server-key' }) {
  const headers = key ? { 'x-packtrail-liner-key': key } : {};
  return worker.fetch(new Request('https://local/api/liner/balance', { method: 'POST', headers }), env);
}
let response = await check();
assert.deepEqual(await response.json(), { balance_usd: '0.000000', currency: 'USD', source: 'server' });
assert.equal(usedKey, 'server-key');
response = await check('session-key');
assert.equal((await response.json()).source, 'session');
assert.equal(usedKey, 'session-key');
response = await check('bad-key');
assert.equal(response.status, 401);
assert(!JSON.stringify(await response.json()).includes('bad-key'));
response = await check('', {});
assert.equal(response.status, 503);
console.log('Server key, session key, zero balance and invalid key checks passed.');
