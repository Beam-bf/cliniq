import { SCENARIO_STAGES, STAGE_ORDER } from '@/data/scenario';
import type { StageId } from '@/types';

export default function Header({ stage }: { stage: StageId }) {
  const scenario = SCENARIO_STAGES[stage];
  return <header className="briefing-header">
    <div className="flex items-center justify-between gap-4">
      <p className="eyebrow">Specialist capacity / Planning briefing</p>
      <span className="briefing-number">0{STAGE_ORDER.indexOf(stage) + 1} / 03</span>
    </div>
    <h1>{scenario.label.replace(/^Stage \d /, '')}</h1>
    <p className="briefing-deck">{scenario.description}</p>
    <div className="briefing-meta"><span>ClinIQ</span><span>Weekly aggregate figures</span><span>Human-approved planning</span></div>
  </header>;
}
