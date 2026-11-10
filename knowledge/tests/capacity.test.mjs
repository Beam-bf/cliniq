import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reviewCapacity } from '../../analysis/capacity-2022-2033/review.mjs';

test('all 40 collected capacity rows are checked against the original PDF cells; unresolved source arithmetic is excluded', async () => {
  const original = JSON.parse(await readFile('analysis/capacity-2022-2033/submitted.json','utf8'));
  const result = await reviewCapacity(await readFile('.knowledge/raw/dha-capacity.pdf'), original);
  assert.deepEqual(result, JSON.parse(await readFile('analysis/capacity-2022-2033/reviewed.json','utf8')));
  assert.deepEqual(result.counts,{reviewed:40,correctedInputRows:4,excluded:12,included:28});
  const included = result.records.filter(r=>r.verification.includedInNumericalConclusions);
  assert.ok(included.every(r=>Math.abs(r.verified.supply-r.verified.demand-r.verified.capacity_gap)<0.000001));
  const psychiatry = included.find(r=>r.verified.specialty==='Psychiatry'&&r.verified.year===2025);
  assert.equal(psychiatry.original.demand,343);assert.equal(psychiatry.verified.demand,323);assert.equal(psychiatry.verified.capacity_gap,-107);
  assert.ok(result.records.filter(r=>r.verified.specialty==='Cardiothoracic Surgery'&&[2025,2030].includes(r.verified.year)).every(r=>!r.verification.includedInNumericalConclusions));
});
test('an altered PDF or unreviewed submitted key cannot silently enter the capacity review', async () => {
  const bytes=await readFile('.knowledge/raw/dha-capacity.pdf');
  const rows=JSON.parse(await readFile('analysis/capacity-2022-2033/submitted.json','utf8'));
  const changed=Buffer.from(bytes);changed[200]^=1;
  await assert.rejects(()=>reviewCapacity(changed,rows),/changed/);
  rows[0].specialty='Unreviewed';await assert.rejects(()=>reviewCapacity(bytes,rows),/Unreviewed/);
});
test('reviewed capacity rows preserve modelled demand, projection provenance, units and exact row/year citations', async () => {
  const result=JSON.parse(await readFile('analysis/capacity-2022-2033/reviewed.json','utf8'));
  assert.equal(result.records.filter(r=>r.dataClass==='planning-projection').length,30);
  assert.ok(result.records.every(r=>r.demandType.includes('modelled')&&r.verified.planning_unit==='acute overnight beds'&&r.provenance.pdfPage===41&&r.provenance.demandColumnYear===r.verified.year));
  assert.ok(result.records.filter(r=>r.verified.year>2025).every(r=>r.provenance.supplyColumnYear===2025));
});
