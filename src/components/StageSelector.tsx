import { SCENARIO_STAGES, STAGE_ORDER } from '@/data/scenario';
import type { StageId } from '@/types';

interface StageSelectorProps { value: StageId; onChange: (stage: StageId) => void }

export default function StageSelector({ value, onChange }: StageSelectorProps) {
  return <div role="group" aria-label="Planning stage" className="stage-list">
    {STAGE_ORDER.map((stageId, index) => <button
      key={stageId} type="button" aria-pressed={stageId === value}
      onClick={() => onChange(stageId)} className="stage-button">
      <span className="stage-number">0{index + 1}</span>
      <span>{SCENARIO_STAGES[stageId].label.replace(/^Stage \d /, '')}</span>
    </button>)}
  </div>;
}
