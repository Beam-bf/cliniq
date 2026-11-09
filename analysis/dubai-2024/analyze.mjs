// Reproduce this descriptive analysis with Node; no backend or credentials used.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('./', import.meta.url);
const source = JSON.parse(readFileSync(new URL('source-data.json', root), 'utf8'));
assert.equal(source.referenceYear, 2024);
assert.equal(source.groups.length, 3);
const identifiers = new Set();
for (const group of source.groups) {
  assert.ok(!identifiers.has(group.id), 'Duplicate group');
  identifiers.add(group.id);
  assert.ok(group.categories.length > 0);
  assert.equal(new Set(group.categories.map(row => row.id)).size, group.categories.length);
  for (const row of group.categories) assert.ok(Number.isSafeInteger(row.count) && row.count >= 0);
  assert.equal(group.categories.reduce((sum, row) => sum + row.count, 0), group.reportedTotal,
    `Category counts must reconcile to Table ${group.table}'s published total`);
}
const facilities = source.groups.find(group => group.id === 'facilities');
const workforce = source.groups.find(group => group.id === 'workforce');
const physicians = source.groups.find(group => group.id === 'physicians');
assert.equal(workforce.categories.find(row => row.id === 'physicians').count, physicians.reportedTotal,
  'The physician subset must reconcile across Tables 11 and 12');

const groups = source.groups.map(group => ({ ...group, categories: group.categories.map(row => ({
  ...row, sharePercent: Number((100 * row.count / group.reportedTotal).toFixed(2)),
})) }));
const summary = {
  referenceYear: source.referenceYear, geography: source.geography,
  sourceUrl: source.url, accessedDate: source.accessedDate,
  method: 'Descriptive snapshot. Shares = category count / its own table total * 100. Display rounded to two decimals.',
  checks: { tableTotalsReconciled: true, physicianSubsetReconciled: true },
  groups,
  limits: [
    'A single 2024 aggregate snapshot, not live data or a time series.',
    'Licensed workforce counts do not measure FTEs, worked hours, vacancies or spare capacity.',
    'Physician categories are a subset of workforce, not additional personnel to add to it.',
    'Facility counts include pharmacies and other facility types; they are not all hospitals or specialist clinics.',
    'These tables do not provide the clinic/specialty waiting histories, referrals and available hours required by the existing simulation.',
    'No shortage, transfer recommendation, seasonal effect, waiting-time forecast or clinical benefit is established by this analysis.',
  ],
};
writeFileSync(new URL('results.json', root), JSON.stringify(summary, null, 2) + '\n');
const escape = value => `"${String(value).replaceAll('"', '""')}"`;
const headers = ['reference_year','geography','group','category','count','unit','table_total','share_percent','source_table','source_pdf_page','source_url'];
const rows = groups.flatMap(group => group.categories.map(row => [source.referenceYear,source.geography,
  group.id,row.label,row.count,group.unit,group.reportedTotal,row.sharePercent,group.table,group.pdfPage,source.url]));
writeFileSync(new URL('results.csv', root), [headers,...rows].map(row => row.map(escape).join(',')).join('\n') + '\n');

const table = group => [
  `### ${group.title}`,
  `Source: Table ${group.table}, PDF page ${group.pdfPage}. Denominator: ${group.reportedTotal.toLocaleString('en-US')} ${group.unit}.`,
  '| Category | Published count | Calculated share |',
  '| --- | ---: | ---: |',
  ...group.categories.map(row => `| ${row.label} | ${row.count.toLocaleString('en-US')} | ${row.sharePercent.toFixed(2)}% |`),
].join('\n\n').replaceAll('|\n\n|', '|\n|');
const report = `# Dubai healthcare resources: first real-data analysis

Backend development is on hold at the user's request. This analysis is separate from the website's fictional clinic simulation.

Question: what is the scale and composition of Dubai's licensed healthcare workforce and facilities in the official 2024 snapshot?

Source: [${source.title}](${source.url}), ${source.publisher}, reference year ${source.referenceYear}; accessed ${source.accessedDate}. Category totals were manually transcribed from Tables 10–12. Counts are source observations; percentages below are calculations. English labels are lightly normalized, and the combined physician grouping retains the source abbreviation rather than assigning an unverified interpretation. This is a starting dataset, not a claim that it is the latest available publication.

## Findings

- The workforce table reports 66,070 licensed personnel. Nurses are the largest of its five job categories: 25,066, or ${(100*25066/66070).toFixed(2)}%.
- Among 14,861 licensed physicians, 6,642 are specialists (${(100*6642/14861).toFixed(2)}%) and 3,396 consultants (${(100*3396/14861).toFixed(2)}%). These are job categories, not a breakdown by medical specialty.
- The facilities table reports 5,372 licensed facilities, including 1,665 polyclinics, 87 specialty clinics/centers and 57 hospitals. The full denominator also includes pharmacies and other types.
- All three sets of category counts reconcile to their published totals. The physician total also matches between Tables 11 and 12. This checks internal consistency of the transcription, not independent accuracy of the publication.

## Reproducible tables

${groups.map(table).join('\n\n')}

## What this means for HalaCapacity

These figures provide real regional context and workforce composition. They do not identify which individual clinics have excess hours or waiting-list pressure. Licensed counts cannot be converted into available specialist hours without additional evidence.

${summary.limits.map(value=>'- '+value).join('\n')}

The eight-week limit, six-week clinic histories and winter/leave assumptions in the existing app remain fictional simulation inputs. No real figures from this analysis have been assigned to Alpha–Foxtrot or substituted into their forecasts. User validation remains pending.

## Next analysis

For observed demand and capacity, obtain an aggregate series with reporting period, facility identifier, medical specialty, a defined waiting-time measure, referral counts, and scheduled/available specialist hours with matching units and coverage. Record missing data explicitly. Establish whether availability means unbooked hours, contracted hours or another measure before comparing facilities. A trend or forecasting exercise needs repeated observations and held-out evaluation; a single annual snapshot cannot support it.

Public waiting-time datasets from another jurisdiction can be studied separately, with their original geography, definitions and periods. They must not be relabelled as Dubai clinic operations.

## Run and inspect

Run \`node analysis/dubai-2024/analyze.mjs\` from the project root. It validates counts and regenerates this report, \`results.csv\` and \`results.json\` using only built-in Node modules. No packages, account access, database changes or deployment are required.
`;
writeFileSync(new URL('REPORT.md', root), report);
console.log('Reconciled 3 published table totals and the physician subset; generated REPORT.md, results.csv and results.json (22 category rows).');
