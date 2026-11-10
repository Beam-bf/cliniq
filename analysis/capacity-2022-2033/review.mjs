import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const SOURCE = {
  publisher: 'Dubai Health Authority', title: 'Dubai Clinical Services Capacity Plan 2022–2033',
  url: 'https://dha.gov.ae/uploads/032026/Dubai_CSCP_20222026346675.pdf',
  sha256: 'a4bcf303c98ff3c8c8978e895f54ace4011e73a193e7371f9af26b87df60c375',
  table: '12: Acute overnight bed gap by specialty', captionPdfPage: 40, pdfPage: 41,
  printedPage: '41', jurisdiction: 'Dubai', reviewedOn: '2026-11-10',
  classification: 'planning-guidance', originalExtraction: 'User-provided healthcare dataset csv.zip / Dubai_CSCP.txt',
  method: 'Table column order visually checked against PDF page 41; every recorded cell is also checked against native PDF text. Source discrepancies are retained and excluded, never silently repaired.',
};
// Reviewed table rows, in original column order: four supplies, four demands, four gaps.
export const TABLE_ROWS = [
  ['Pediatric Medicine', [369,369,369,369,386,470,580,646,-17,-101,-211,-277]],
  ['Gastroenterology', [91,91,91,91,71,178,284,347.6,20,-87,-194,-257]],
  ['Orthopedics', [213,213,213,213,141,272,390,460.8,72,-59,-177,-248]],
  ['Cardiothoracic Surgery', [101,101,101,101,127,213,278,317,-25,-111,-176,-216]],
  ['Respiratory Medicine', [135,135,135,135,203,293,328,349,-67,-159,-193,-214]],
  ['Psychiatry', [216,216,216,216,264,323,343,355,-48,-107,-127,-139]],
  ['Renal Medicine', [38,38,38,38,33,82,132,162,5,-44,-94,-124]],
  ['Paediatric Surgery', [64,64,64,64,68,112,148,169.6,-4,-48,-84,-106]],
  ['Obstetrics', [579,579,579,579,331,513,618,681,245,65,-39,-102]],
  ['Urology', [56,56,56,56,30,67,114,142.2,26,-11,-58,-86]],
];

export async function reviewCapacity(bytes, submitted) {
  if (createHash('sha256').update(bytes).digest('hex') !== SOURCE.sha256) throw new Error('Source PDF changed; reverify original tables');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  try {
    const text = (await (await pdf.getPage(41)).getTextContent()).items.filter(x => 'str' in x).map(x => x.str).join(' ').replace(/\s+/g, ' ');
    for (const [i, [specialty, cells]] of TABLE_ROWS.entries()) {
      const match = new RegExp(`(?:^| )${i + 1} ${specialty} ((?:-?\\d+(?:\\.\\d+)? ){11}-?\\d+(?:\\.\\d+)?)`).exec(text);
      if (!match || JSON.stringify(match[1].split(' ').map(Number)) !== JSON.stringify(cells)) throw new Error(`PDF table cells do not match review: ${specialty}`);
    }
  } finally { await task.destroy(); }
  const years = [2022,2025,2030,2033];
  if (!Array.isArray(submitted) || submitted.length !== 40 || new Set(submitted.map(r => `${r.specialty}:${r.year}`)).size !== 40) throw new Error('Expected 40 unique submitted specialty/year rows');
  const records = submitted.map(original => {
    const row = TABLE_ROWS.findIndex(([name]) => name === original.specialty);
    const position = years.indexOf(original.year);
    if (row < 0 || position < 0) throw new Error('Unreviewed specialty/year cannot enter numerical conclusions');
    const cells = TABLE_ROWS[row][1];
    const verified = { specialty: original.specialty, year: original.year, supply: cells[original.year === 2022 ? 0 : 3], demand: cells[4 + position], capacity_gap: cells[8 + position], planning_unit: 'acute overnight beds' };
    const correctedFields = ['supply','demand','capacity_gap'].filter(k => original[k] !== verified[k]);
    const computedGap = Number((verified.supply - verified.demand).toFixed(6));
    const unresolved = Math.abs(computedGap - verified.capacity_gap) > 0.000001;
    return { original, verified, provenance: { ...SOURCE, tableRow: row + 1, demandColumnYear: original.year,
      supplyColumnYear: original.year === 2022 ? 2022 : 2025 },
      dataClass: original.year === 2022 ? 'public-planning-baseline' : 'planning-projection',
      demandType: 'modelled demand, not observed clinic waiting times',
      supplyAssumption: original.year > 2025 ? '2025 table supply held constant; not observed future supply' : 'published supply scenario',
      verification: { status: unresolved ? 'source-discrepancy' : correctedFields.length ? 'corrected-extraction' : 'verified',
        correctedFields, computedGap, publishedGap: verified.capacity_gap, includedInNumericalConclusions: !unresolved,
        reason: unresolved ? 'Published supply minus demand does not equal published gap. Rounding may explain some differences, but has not been established. Excluded pending authoritative clarification.' : 'Reviewed values agree with source and reconcile arithmetically.' } };
  });
  return { source: SOURCE, policy: 'No training labels, clinic assignments, total-shortage estimates or clinical authorization are inferred. Only rows explicitly included may be used in numerical conclusions; never aggregate an incomplete subset as the full table.',
    counts: { reviewed: records.length, correctedInputRows: records.filter(r => r.verification.correctedFields.length).length,
      excluded: records.filter(r => !r.verification.includedInNumericalConclusions).length,
      included: records.filter(r => r.verification.includedInNumericalConclusions).length }, records };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await reviewCapacity(await readFile('.knowledge/raw/dha-capacity.pdf'), JSON.parse(await readFile(new URL('./submitted.json', import.meta.url), 'utf8')));
  await writeFile(new URL('./reviewed.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result.counts));
}
