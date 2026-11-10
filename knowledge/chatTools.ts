import type { ChatTools } from '../functions/_lib/chatTools.ts';
import type { KnowledgeStore } from './store.ts';
import { policyRequest } from './api.ts';

export function localChatTools(store: KnowledgeStore): ChatTools {
  return {
    searchPolicy: (query, previousQuery) => policyRequest(store, { action: 'search', query, previousQuery }),
    assessPolicy: request => policyRequest(store, { action: 'assess', stageId: request.scenarioId, adjustments: request.adjustments ?? {} }),
    recordExecution: snapshot => store.recordAudit('chat', snapshot),
  };
}
