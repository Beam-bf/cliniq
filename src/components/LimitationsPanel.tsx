import Panel from '@/components/Panel';

const LIMITATIONS = [
  'All figures are fictional test data. They do not describe any real clinic, patient, or region.',
  'No patient data is used or stored. Figures are aggregate weekly operational numbers only.',
  'Agents are calculations based on rules, not machine learning. They follow fixed formulas that anyone can read in the code.',
  'The forecast is a simple linear trend over the last 6 weeks, with one seasonal multiplier. It ignores many real drivers such as staff leave timing, demand shocks, and policy changes.',
  'Forecast trend consistency measures only how well a straight line fits six observations. It is not validated predictive accuracy or evidence of future clinical outcomes.',
  'Policy passages are matched by keyword against short quoted extracts. Matching is not a judgement of whether a passage supports a recommendation, so a reviewer must check each link.',
  'Only sources marked verified are used as evidence. Unverified items are shown for transparency and are never cited.',
  'This tool has not been validated for real clinical, operational, or planning use. Do not use its output to change schedules, staffing, or care without independent review.',
  'Every recommendation needs a human decision. Approving here records a decision only and does not change any booking or roster.',
  'Demo plans and history are stored in this browser only. Connected accounts save their own plans and history to the configured backend. Neither mode changes schedules.',
  'The optional chat LLM only explains supplied context. It can still make unsupported claims. Offline answers use templates; chat cannot approve or change proposals.',
  'Do not enter personal information into chat or decision reasons. Chat input screening catches common patterns only and cannot guarantee removal of personal data.',
];

export default function LimitationsPanel() {
  return (
    <Panel
      title="Limitations"
      description="Read before using any recommendation shown on this page."
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {LIMITATIONS.map((item) => (
          <li key={item} className="flex gap-3 rounded-sm bg-transparent p-4 text-sm text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-slate-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
