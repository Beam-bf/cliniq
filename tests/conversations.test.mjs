import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineAnswer, inputError, buildContext } from '../src/chat/core.ts';
import { answerChat } from '../functions/api/chat.ts';
import { SCENARIO_STAGES } from '../src/data/scenario.ts';

test('clinic-specific answers use the currently applied pair rather than dashboard totals', () => {
  for(const scenarioId of Object.keys(SCENARIO_STAGES))for(const pair of SCENARIO_STAGES[scenarioId].records){
    const answer=offlineAnswer({question:`What are ${pair.clinicId} ${pair.specialtyId} hours and referrals?`,scenarioId,history:[]});
    assert.ok(answer.answer.includes(`${pair.freeSpecialistHoursPerWeek} free specialist hours/week`));
    assert.ok(answer.answer.includes(`${pair.referralsPerWeek} referrals/week`));
    assert.ok(answer.answer.includes(`current wait ${pair.waitingWeeksHistory.at(-1)} weeks`));
    assert.ok(answer.answer.includes('fictional inputs'));
  }
});
test('operational follow-ups retain clinic context but re-read current adjustments', () => {
  const request={question:'And its referrals?',scenarioId:'baseline',history:[{role:'user',content:'How many hours does Alpha psychiatry have?'}],adjustments:{'alpha:psychiatry':{waitingWeeks:8.5,freeHours:2,referrals:50}}};
  const answer=offlineAnswer(request);
  assert.ok(answer.answer.includes('Clinic Alpha Psychiatry: current wait 8.5 weeks; 2 free specialist hours/week; 50 referrals/week'));
  const other=offlineAnswer({...request,question:'And Bravo psychiatry?'});
  assert.ok(other.answer.includes('Clinic Bravo Psychiatry: current wait 3.2 weeks; 12 free specialist hours/week; 30 referrals/week'));
  const chained=offlineAnswer({...request,question:'And its wait?',history:[{role:'user',content:'And its referrals?'},{role:'assistant',content:answer.answer}]});
  assert.ok(chained.answer.includes('current wait 8.5 weeks; 2 free specialist hours/week; 50 referrals/week'));
});
test('public consent and retention questions are allowed while patient identifiers and clinical advice remain blocked', () => {
  assert.equal(inputError('What does DHA require for patient consent for telehealth?'),null);
  assert.equal(inputError('How long must telehealth patient records be retained?'),null);
  for(const q of ['Patient: Jane Doe','My patient needs help','Patient MRN 1234567','What treatment should I take?'])assert.ok(inputError(q));
});
test('no provider configuration produces honest offline answers; mocked provider receives the same current clinic facts on a follow-up', async () => {
  const request={question:'And its referrals?',scenarioId:'baseline',history:[{role:'user',content:'How many hours does Alpha psychiatry have?'}],adjustments:{'alpha:psychiatry':{waitingWeeks:8.5,freeHours:2,referrals:50}}};
  let calls=0;
  assert.equal((await answerChat(request,{},async()=>{calls++;throw new Error('must not call')})).mode,'offline');assert.equal(calls,0);
  const context=buildContext(request);assert.equal(context.stage.records[0].referralsPerWeek,50);
  const answer=await answerChat(request,{AI_PROVIDER:'cloudflare',AI_API_KEY:'test',AI_ACCOUNT_ID:'test',AI_MODEL:'test'},async(_url,options)=>{
    const payload=JSON.parse(JSON.parse(options.body).messages[1].content);assert.equal(payload.CONTEXT.stage.records[0].freeSpecialistHoursPerWeek,2);assert.equal(payload.UNTRUSTED_HISTORY[0].content,request.history[0].content);
    return Response.json({result:{response:'Fictional Clinic Alpha psychiatry currently has 2 free hours and 50 referrals per week.'}});
  });assert.equal(answer.mode,'live');
});
