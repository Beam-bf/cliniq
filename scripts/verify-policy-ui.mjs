// Use installed Chrome with an isolated --user-data-dir ending in policy-profile,
// --remote-debugging-port=9232 and --enable-automation; UI on port 5173, KB on 8788.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const health = await fetch('http://127.0.0.1:8788/api/policy/health').then(r => r.json());
assert.equal(health.engine, 'pgvector'); assert.equal(health.chunkCount, 44);
const tabs = await fetch('http://127.0.0.1:9232/json/list').then(r => r.json());
const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let next = 0; const pending = new Map(), errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const task = pending.get(message.id); pending.delete(message.id);
  if (task) message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result);
});
function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) { for (let i = 0; i < 150; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error(`Timeout: ${expression}`); }
async function input(selector, value) {
  await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
try {
  const command = await call('Browser.getBrowserCommandLine');
  assert.ok(command.arguments.some(arg => arg.includes('policy-profile')), 'Own isolated browser only');
  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['https://*.supabase.co/*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/#overview' });
  await wait(`document.querySelector('.overview-page')`);
  // Storage belongs exclusively to this new QA profile, never the user's browser.
  await evaluate(`localStorage.clear();document.body.dataset.qaReload='pending';location.reload()`);
  await wait(`document.body.dataset.qaReload!=='pending' && document.querySelector('.overview-page')`);
  await evaluate(`location.hash='decisions'`); await wait(`document.querySelector('.recommendation-list button')`);
  await click('.recommendation-list button');
  await wait(`document.querySelector('[aria-label="Policy knowledge review"]')?.textContent.includes('Applicability unresolved')`);
  await wait(`!document.querySelector('#decision-reason').disabled`);
  await input('#decision-reason', 'Fictional planning review; unresolved clinical permissions remain for qualified review.');
  await evaluate(`Array.from(document.querySelectorAll('#decision-detail button')).find(el=>el.textContent.trim()==='Approve').click()`);
  await wait(`document.querySelector('#decision-reason-error')?.textContent.includes('acknowledge')`);
  await click('#decision-detail input[type=checkbox]');
  await evaluate(`Array.from(document.querySelectorAll('#decision-detail button')).find(el=>el.textContent.trim()==='Approve').click()`);
  await wait(`document.querySelector('#decision-detail .status-badge')?.textContent==='Approved'`);
  const audit = await evaluate(`JSON.parse(localStorage.getItem('halacapacity.audit'))[0]`);
  assert.ok(audit.evidence.includes('Policy Agent snapshot:') && audit.evidence.includes(health.kbRevision));
  assert.ok(audit.evidence.includes('sourceSha256') && audit.evidence.includes('"policyAcknowledged":true'));
  assert.ok(audit.evidence.length <= 12000);
  assert.ok(audit.proposalId.endsWith('policy-' + health.kbRevision.slice(0, 12)));
  await click('.chat-launcher'); await wait(`!document.querySelector('.chat-widget').hidden`);
  await input('#planning-question', 'Which DHA telehealth scope and licensing requirements apply?');
  await click('.chat-composer button');
  await wait(`document.querySelector('.chat-mode')?.textContent.includes('Vector knowledge retrieval')`);
  await click('.chat-assistant-message details summary');
  await wait(`document.querySelector('.chat-assistant-message blockquote')`);
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.chat-assistant-message a')).some(a=>a.href.includes('dha.gov.ae')&&a.href.includes('#page='))`));
  const chat = await evaluate(`JSON.parse(localStorage.getItem('halacapacity.chatAudit'))[0]`);
  assert.ok(chat.summary.includes('Vector KB') && chat.summary.includes('retrieval'));
  assert.ok(chat.sourceIds.length);
  async function ask(question) {
    const count = await evaluate(`document.querySelectorAll('.chat-assistant-message').length`);
    await input('#planning-question', question); await click('.chat-composer button');
    await wait(`document.querySelectorAll('.chat-assistant-message').length>${count}`);
    return evaluate(`Array.from(document.querySelectorAll('.chat-assistant-message')).at(-1).textContent`);
  }
  assert.ok((await ask('What does DHA require for patient consent in telehealth?')).includes('Applicability remains unresolved'));
  assert.ok((await ask('Which page is that on?')).includes('Applicability remains unresolved'));
  assert.ok(await evaluate(`Array.from(document.querySelectorAll('.chat-assistant-message')).at(-1).querySelector('a').href.match(/#page=4[0-3]$/)`));
  assert.ok((await ask('Which DHA policy mandates an eight-week specialist waiting target?')).includes('does not establish an answer'));
  assert.ok((await ask('How many free hours does Alpha psychiatry have?')).includes('20 free specialist hours/week'));
  assert.ok((await ask('And its referrals?')).includes('38 referrals/week'));
  assert.ok((await ask('And its wait?')).includes('current wait 4.6 weeks'));
  const desktop = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.browser-qa/policy-desktop.png', Buffer.from(desktop.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), true);
  const mobile = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync('.browser-qa/policy-mobile.png', Buffer.from(mobile.data, 'base64'));
  await evaluate(`document.body.dataset.qaReload='pending';location.reload()`);
  await wait(`document.body.dataset.qaReload!=='pending' && document.querySelector('.recommendation-list button')`);
  await click('.recommendation-list button');
  await wait(`document.querySelector('#decision-detail .status-badge')?.textContent==='Approved'`);
  await evaluate(`location.hash='planner'`); await wait(`document.querySelector('.planner-editor')`);
  await input('.planner-editor label:nth-of-type(2) input', '19'); await click('.planner-editor button');
  await wait(`document.querySelector('.workspace-notice')?.textContent.includes('recalculated')`);
  await evaluate(`location.hash='decisions'`); await wait(`document.querySelector('.recommendation-list button')`); await click('.recommendation-list button');
  await wait(`document.querySelector('#decision-detail .status-badge')?.textContent==='Awaiting review'`);
  for (const [route, selector] of [['evidence','input[type=search]'],['history','#history-title'],['help','#main-content'],['account','#main-content']]) {
    await evaluate(`location.hash=${JSON.stringify(route)}`); await wait(`document.querySelector(${JSON.stringify(selector)})`);
    await wait(`document.querySelector('.workspace-header h1')?.textContent===${JSON.stringify(route[0].toUpperCase()+route.slice(1))}`);
  }
  await call('Network.setBlockedURLs', { urls: ['https://*.supabase.co/*', 'http://127.0.0.1:5173/api/policy*'] });
  await evaluate(`document.body.dataset.qaReload='pending';location.hash='decisions';location.reload()`);
  await wait(`document.body.dataset.qaReload!=='pending' && document.querySelector('.recommendation-list button')`);
  await click('.recommendation-list button');
  await wait(`document.querySelector('[aria-label="Policy knowledge review"]')?.textContent.includes('unavailable')`);
  assert.ok(await evaluate(`JSON.parse(localStorage.getItem('halacapacity.audit')).some(entry=>entry.decision==='approved')`));
  assert.deepEqual(errors, []);
  console.log('PASS: real policy retrieval through existing chat; coordinator evidence; approval acknowledgement; versioned, persisted audit with exact passages; planner recalculation/new review; service-outage human-review fallback; original navigation; desktop/390px layout. No live account writes.');
} finally { socket.close(); }
