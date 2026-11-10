import type { PolicyEvidence, PolicyFinding } from '@/policy/knowledgeTypes';

export function KnowledgePassages({ evidence }: { evidence: PolicyEvidence[] }) {
  return <div className="space-y-4">{evidence.map(hit => <article key={hit.id} className="rounded-sm border border-slate-200 p-3 text-sm">
    <a className="text-teal-700 underline" href={`${hit.url}#page=${hit.pdfPage}`} target="_blank" rel="noreferrer">{hit.title}</a>
    <p className="mt-1 text-xs text-slate-600">{hit.publisher}, {hit.classification}, {hit.jurisdiction}</p>
    <p className="mt-1 text-xs text-slate-600">Version {hit.version}, verified {hit.verifiedOn}, {hit.effectiveOn ? `effective ${hit.effectiveOn}` : 'no effective date stated'}</p>
    <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-teal-700 pl-3">{hit.passage}</blockquote>
    <p className="mt-2 text-xs text-slate-600">{hit.section}, PDF page {hit.pdfPage}, printed page {hit.printedPage}, similarity {hit.score.toFixed(3)}</p>
    {hit.sourceNote && <p className="mt-2 text-xs text-amber-800">Source limits: {hit.sourceNote}</p>}
    <details className="mt-2 text-xs text-slate-500"><summary>Passage provenance</summary><p className="break-all">ID: {hit.id}</p><p className="break-all">PDF SHA-256: {hit.sourceSha256}</p><p>Extracted page character offsets {hit.startOffset} to {hit.endOffset}. Whitespace follows PDF extraction.</p></details>
  </article>)}</div>;
}

export default function PolicyKnowledgeReview({ finding }: { finding: PolicyFinding }) {
  return <section className="rounded-sm border border-amber-200 bg-amber-50 p-4" aria-label="Policy knowledge review">
    <h3 className="text-sm font-semibold">Policy Agent, {finding.status.replace('-', ' ')}</h3>
    <p className="mt-2 text-sm">{finding.summary}</p>
    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">{finding.flags.map(flag => <li key={flag}>{flag}</li>)}</ul>
    {finding.evidence.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm">Retrieved policy passages, {finding.evidence.length}</summary>
      <p className="my-2 text-xs text-slate-600">Real vector retrieval. Similarity is not legal applicability or authorization. Query: {finding.retrievalQuery}</p><KnowledgePassages evidence={finding.evidence} /></details>}
  </section>;
}
