// Explicit browser integration check. Requires a dedicated Chrome profile started
// with --enable-automation --remote-debugging-port=9234 and a profile directory
// containing "halacapacity-chat-qa". Never attaches to a personal browser session.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const debug = process.env.CHAT_QA_CDP ?? 'http://127.0.0.1:9234';
const app = process.env.CHAT_QA_APP ?? 'http://localhost:5173';
for (const value of [debug,app]) if (!['localhost','127.0.0.1'].includes(new URL(value).hostname)) throw Error('Browser QA is limited to loopback addresses.');
const tabs = await fetch(`${debug}/json/list`).then(r=>r.json());
const socket = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let sequence=0;
const pending=new Map(),errors=[],requests=[],results=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
  if(!message.id)return;
  const item=pending.get(message.id);if(!item)return;
  pending.delete(message.id);clearTimeout(item.timer);message.error?item.reject(Error(message.error.message)):item.resolve(message.result);
});
function call(method,params={}) { return new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},30000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
}); }
async function evaluate(expression) {
  const response=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(response.exceptionDetails)throw Error(response.exceptionDetails.text);
  return response.result.value;
}
async function wait(expression) {
  const until=Date.now()+30000;
  while(Date.now()<until) {if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,100));}
  throw Error(`Browser condition timed out: ${expression}`);
}
async function ask(question,expected,{duplicate=false}={}) {
  const before=await evaluate(`document.querySelectorAll('.chat-assistant-message').length`);
  await evaluate(`(()=>{const field=document.querySelector('#planning-question');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,${JSON.stringify(question)});field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`(()=>{const form=document.querySelector('.chat-composer');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));${duplicate ? "form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));" : ''}})()`);
  await wait(`document.querySelectorAll('.chat-assistant-message').length===${before+1} && !document.querySelector('.chat-content[aria-busy="true"]')`);
  const answer=await evaluate(`(()=>{const message=Array.from(document.querySelectorAll('.chat-assistant-message')).at(-1);return {text:message.querySelector('.whitespace-pre-wrap').textContent,mode:message.querySelector('.chat-mode').textContent,links:Array.from(message.querySelectorAll('a')).map(a=>a.href)};})()`);
  assert.ok(answer.text.includes(expected),`${question}: unexpected answer`);
  assert.ok(!answer.mode.includes('Cloudflare'));
  results.push({question,...answer});console.log(`PASS public browser: ${question}`);
  return answer;
}
try {
  const args=await call('Browser.getBrowserCommandLine');
  assert.ok(args.arguments.some(a=>a.includes('--user-data-dir=')&&a.includes('halacapacity-chat-qa')),'Refusing a personal browser profile');
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  await call('Network.setBlockedURLs',{urls:['https://*.supabase.co/*']});
  await call('Page.navigate',{url:`${app}/#overview`});await wait(`document.querySelector('.overview-page')`);
  const before=await evaluate(`JSON.stringify({plans:localStorage.getItem('halacapacity.adjustments'),decisions:localStorage.getItem('halacapacity.audit'),statuses:localStorage.getItem('halacapacity.statuses')})`);
  await evaluate(`document.querySelector('.chat-launcher').click()`);
  await wait(`document.querySelector('#planning-question')`);
  await ask('Hi',"Hello! I'm ClinIQ",{duplicate:true});
  assert.equal(await evaluate(`document.activeElement.id`),'planning-question');
  await ask('Who designed you?','Verified developer information has not been provided');
  await ask('What is the Bitcoin price?','outside healthcare operations');
  await ask('asdfgh xyzzy','Could you clarify');
  const forecast=await ask('Explain Alpha psychiatry forecast','Planning horizon: 8 weeks');assert.deepEqual(forecast.links,[]);
  await ask('And its referrals?','38 referrals/week');
  await ask('Explain the recommendation.','Which recommendation');
  await ask('Compare Routing, Task-Shifting and Tele-Pooling','Why and constraints');
  await ask('What if Alpha psychiatry had 30 free hours?','30 free hours/week');
  await ask('And its referrals?','30 free specialist hours/week');
  const policy=await ask('What are DHA telehealth consent requirements?','Applicability remains unresolved');
  assert.ok(policy.links.some(url=>/dha\.gov\.ae.*#page=4[0-3]$/.test(url)));
  await ask('Which DHA policy mandates an eight-week waiting target?','does not establish an answer');
  await ask('Can you book specialist schedules?','No action has been taken');
  assert.equal(await evaluate(`JSON.stringify({plans:localStorage.getItem('halacapacity.adjustments'),decisions:localStorage.getItem('halacapacity.audit'),statuses:localStorage.getItem('halacapacity.statuses')})`),before);
  assert.equal(requests.some(url=>url.includes('/api/chat')||url.includes('api.cloudflare.com')),false,'Public demo must never call cloud chat');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  assert.equal(await evaluate(`document.querySelector('.chat-widget').getBoundingClientRect().width<=390`),true);
  await mkdir('.browser-qa/halacapacity-chat-qa',{recursive:true});
  const screenshot=await call('Page.captureScreenshot',{format:'png'});
  await writeFile('.browser-qa/halacapacity-chat-qa/mobile.png',Buffer.from(screenshot.data,'base64'));
  await evaluate(`document.querySelector('#planning-question').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await wait(`document.querySelector('.chat-widget').hidden`);
  assert.equal(await evaluate(`document.activeElement.classList.contains('chat-launcher')`),true);
  assert.deepEqual(errors,[]);
  await mkdir('.knowledge',{recursive:true});
  await writeFile('.knowledge/chat-browser-verification.json',JSON.stringify({passed:true,results,publicCloudCalls:0,storedPlansAndApprovalsUnchanged:true,mobileWidth:390,exceptions:errors},null,2));
  console.log(`PASS: ${results.length} public conversations; duplicate submission, focus, Escape, exact policy links, 390px layout, no plan/approval writes and zero public chat API calls.`);
} finally { socket.close(); }
