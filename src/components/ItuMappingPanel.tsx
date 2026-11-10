import Panel from '@/components/Panel';

const mappings = [
  ['Fictional data', 'SRC (source) analogy', 'Static scenario records and existing policy extracts; no live collection pipeline.'],
  ['Rule based agents', 'No M (model) equivalence claimed', 'Four fixed rule calculations; no trained capacity-planning model.'],
  ['Coordinator', 'MLFO orchestration analogy', 'Combines agent outputs and flags conflicts/gaps; no ML lifecycle management.'],
  ['Human review', 'Accountability theme', 'A reviewer records a decision and reason; schedules remain unchanged.'],
  ['Audit history', 'Transparency theme', 'Visible decisions and chat summaries; browser storage in demo, account database when connected. Not an independent audit trail.'],
];

export default function ItuMappingPanel() {
  return (
    <Panel
      title="ITU concept alignment, draft"
      description="Interpretive comparison for review. No conformance, certification, endorsement or readiness score is claimed."
    >
      <div className="space-y-5 text-sm leading-relaxed">
        <p>ITU-T Y.3172 addresses ML in telecommunications. Section 8.1 names SRC (source), C (collector), PP (preprocessor), M (model), P (policy), D (distributor), SINK, and the machine learning function orchestrator (MLFO). These names were checked in the official text. <a className="text-teal-700 underline" href="https://www.itu.int/rec/dologin_pub.asp?id=T-REC-Y.3172-201906-I!!PDF-E&lang=e&type=items" target="_blank" rel="noreferrer">Y.3172 (06/2019), §8.1, pp. 14 to 15</a>.</p>
        <p>The ITU AI Readiness page identifies transparency and accountability among its ethics concerns. We use these as discussion themes. <a className="text-teal-700 underline" href="https://aiforgood.itu.int/ai-readiness/" target="_blank" rel="noreferrer">ITU AI Readiness, Ethics</a>.</p>
        <div className="overflow-x-auto"><table className="concept-table min-w-full text-left text-sm">
          <caption className="sr-only">Draft interpretation of implemented features against ITU concepts</caption>
          <thead><tr><th scope="col">Implemented feature</th><th scope="col">Concept / interpretation</th><th scope="col">Practical boundary</th></tr></thead>
          <tbody>{mappings.map(([feature, concept, boundary]) => <tr key={feature}><th scope="row">{feature}</th><td>{concept}</td><td>{boundary}</td></tr>)}</tbody>
        </table></div>
        <p className="text-xs text-slate-600">Review date: 9 November 2026. The optional chat LLM explains supplied context; it does not replace the four rule-based agents. Mapping applicability and formal readiness metrics remain unverified. The <a className="text-teal-700 underline" href="https://www.itu.int/epublications/publication/ai-ready-analysis-towards-a-standardized-readiness-framework" target="_blank" rel="noreferrer">AI Ready report</a> body was not directly readable during this review, so no report-specific metric claim is made.</p>
      </div>
    </Panel>
  );
}
