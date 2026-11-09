import { DELEGABLE_TASKS } from '@/data/scenario';
import { runForecastAgent } from '@/agents/forecast';
import { runRoutingAgent } from '@/agents/routing';
import { runTaskShiftingAgent } from '@/agents/taskShifting';
import { runTelePoolingAgent } from '@/agents/telePooling';
import type { AgentResult, ScenarioStage } from '@/types';

export function runAllAgents(stage: ScenarioStage): AgentResult[] {
  return [
    runForecastAgent(stage),
    runRoutingAgent(stage),
    runTaskShiftingAgent(DELEGABLE_TASKS),
    runTelePoolingAgent(stage),
  ];
}
