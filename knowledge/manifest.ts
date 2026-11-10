import type { LegalClassification } from '../src/policy/knowledgeTypes.ts';

export interface Selection { pdfPage: number; printedPage: string; section: string; start: string; end?: string }
export interface VerifiedDocument {
  id: string; title: string; publisher: string; url: string; jurisdiction: string;
  classification: LegalClassification; version: string; verifiedOn: string;
  effectiveOn: string | null; sha256: string; cacheFile: string; selections: Selection[];
  verificationNote: string;
}
// Reviewed official editions and bounded sections, not a claim of complete legal coverage.
// A changed PDF hash must be manually reverified; ingestion never silently trusts replacements.
export const DOCUMENTS: VerifiedDocument[] = [
  { id: 'DHA-TELEHEALTH-4', title: 'Standards for Telehealth Services', publisher: 'Dubai Health Authority, Health Regulation Sector',
    url: 'https://dha.gov.ae/uploads/012023/Standards%20for%20Telehealth%20Services2023158613.pdf', jurisdiction: 'Dubai / DHA-licensed facilities and professionals',
    classification: 'regulatory-standard', version: '4; DHA/HRS/HPSD/ST-14', verifiedOn: '2026-11-10', effectiveOn: '2025-11-26',
    sha256: '183d2dad8092b46f06ceb6e1fdcdb4d3e289d59dbe1108bbca4d045983a8ce84', cacheFile: 'dha-telehealth.pdf',
    verificationNote: 'Official PDF header and selected clauses directly checked. Applies to telehealth; e-referral clauses are not universal in-person referral rules. Current clinician/facility permissions are not supplied by this document.',
    selections: [
      { pdfPage: 21, printedPage: '21', section: '4. Applicability and exclusions', start: '4\\.\\s+APPLICABILITY', end: '5\\.\\s+STANDARD ONE' },
      { pdfPage: 37, printedPage: '37', section: '9. Healthcare professionals requirements', start: '9\\.\\s+STANDARD FIVE' },
      { pdfPage: 50, printedPage: '50', section: '13.7–13.7.1 Electronic referrals and exception', start: '13\\.7\\.', end: '13\\.8\\.' },
      { pdfPage: 50, printedPage: '50', section: '14.1 Teleconsultation requirements', start: '14\\.\\s+STANDARD TEN' },
      { pdfPage: 24, printedPage: '24', section: '6.1–6.3.2 Cross-border framework and entity agreements', start: '6\\.\\s+STANDARD TWO' },
      { pdfPage: 27, printedPage: '27', section: '7.1–7.2.1 Facility licensing categories', start: '7\\.\\s+STANDARD THREE', end: '7\\.3\\.' },
      { pdfPage: 33, printedPage: '33', section: '8.2.1–8.2.2 Staffing, face-to-face cover and training', start: '8\\.2\\.' },
      { pdfPage: 40, printedPage: '40', section: '10.1–10.1.1 Documented and electronic consent', start: '10\\.\\s+STANDARD SIX' },
      { pdfPage: 41, printedPage: '41', section: '10.2.1–10.2.7 Consent content and refusal', start: '10\\.2\\.' },
      { pdfPage: 42, printedPage: '42', section: '10.2.8–10.5.1 Consent, liability and exception (continued)', start: '10\\.2\\.8\\.' },
      { pdfPage: 43, printedPage: '43', section: '10.5.2–10.5.5 Consent exceptions (continued)', start: '10\\.5\\.2\\.', end: '10\\.6\\.' },
      { pdfPage: 44, printedPage: '44', section: '11.1–11.4 Health record management', start: '11\\.\\s+STANDARD SEVEN' },
      { pdfPage: 45, printedPage: '45', section: '11.5–11.6.8 Encounter documentation (continued)', start: '11\\.5\\.' },
      { pdfPage: 46, printedPage: '46', section: '11.6.9–11.10 Secure records and retention', start: '11\\.6\\.9\\.', end: '12\\.\\s+STANDARD EIGHT' },
    ] },
  { id: 'DHA-PRIVILEGING-2', title: 'Clinical Privileging Policy', publisher: 'Dubai Health Authority, Health Regulation Sector',
    url: 'https://www.dha.gov.ae/uploads/072025/Clinical%20Privileging%20Policy202573930.pdf', jurisdiction: 'Dubai / DHA-licensed facilities and professionals',
    classification: 'regulatory-policy', version: '2; DHA/HRS/HPSD/HP-02', verifiedOn: '2026-11-10', effectiveOn: '2025-09-03',
    sha256: '9c6a0c474e473c5d878b8148a9571e0b53bd6041f06faaeea95ec6cefe0ecdbc', cacheFile: 'dha-privileging.pdf',
    verificationNote: 'Official version 2 cover, scope, definitions and policy statements checked. Scope/privileging guidance does not establish any named nurse or GP competence, licence or delegation permission.',
    selections: [
      { pdfPage: 2, printedPage: '2', section: '2. Scope; 3.1–3.3 Clinical privileging definitions', start: '2\\.\\s+Scope' },
      { pdfPage: 3, printedPage: '3', section: '3.9 Scope of practice', start: '3\\.9\\.' },
      { pdfPage: 6, printedPage: '6', section: '4.4–4.7 Scope and facility capability constraints', start: '4\\.4\\.', end: '4\\.7\\.1\\.' },
      { pdfPage: 5, printedPage: '5', section: '4.2.4–4.3.7 Privileging framework, rotation and part-time staff', start: '4\\.2\\.4\\.' },
      { pdfPage: 6, printedPage: '6', section: '4.7.1(a–c) Written service specifications (continued)', start: '4\\.7\\.1\\.' },
      { pdfPage: 7, printedPage: '7', section: '4.7.1(d–h)–4.10.2 Staffing specifications and CPC accountability', start: 'd\\.\\s+Minimum staffing' },
      { pdfPage: 8, printedPage: '8', section: '4.10.3–4.13.2 Advanced practice and credential verification', start: '4\\.10\\.3\\.' },
      { pdfPage: 9, printedPage: '9', section: '4.13.3–4.13.12 CPC records, review and final decisions', start: '4\\.13\\.3\\.' },
    ] },
  { id: 'DHA-CAPACITY-2022-2033', title: 'Dubai Clinical Services Capacity Plan 2022–2033', publisher: 'Dubai Health Authority',
    url: 'https://dha.gov.ae/uploads/032026/Dubai_CSCP_20222026346675.pdf', jurisdiction: 'Dubai',
    classification: 'planning-guidance', version: '2022–2033; edition date not stated', verifiedOn: '2026-11-10', effectiveOn: null,
    sha256: 'a4bcf303c98ff3c8c8978e895f54ace4011e73a193e7371f9af26b87df60c375', cacheFile: 'dha-capacity.pdf',
    verificationNote: 'Official plan cover and section 6.7 checked. Text/table discrepancies are retained as a caution; these regional projections do not establish clinic capacity, referral permissions or an eight-week legal target.',
    selections: [{ pdfPage: 54, printedPage: '54', section: '6.7 Non-Acute Care and Long-Term Care beds', start: '6\\.7\\s+Non-Acute', end: 'Figure 20' }] },
  { id: 'UAE-AI-2031', title: 'UAE National Strategy for Artificial Intelligence 2031', publisher: 'UAE Artificial Intelligence Office',
    url: 'https://ai.gov.ae/wp-content/uploads/2021/07/UAE-National-Strategy-for-Artificial-Intelligence-2031.pdf', jurisdiction: 'UAE',
    classification: 'government-strategy', version: '2031 strategy; edition not stated', verifiedOn: '2026-11-10', effectiveOn: null,
    sha256: '79e05c502d1fc1247165fc744205984675d6422a490a70201dc4c05bf9aed693', cacheFile: 'uae-ai.pdf',
    verificationNote: 'Official AI Office PDF downloaded and reviewed. PDF uses two-page spreads; physical page 22 contains printed pages 42–43. Strategy direction is not clinical authorization or binding healthcare law.',
    selections: [{ pdfPage: 22, printedPage: '42–43', section: 'Objective 8: Governance and effective regulation', start: 'The speed of developments', end: 'National Governance\\s+Review' }] },
];
