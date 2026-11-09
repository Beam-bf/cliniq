import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatPanel from '@/components/ChatPanel';
import { SCENARIO_STAGES } from '@/data/scenario';
import type { ChatAudit } from '@/chat/core';
import type { AuditEntry, StageId } from '@/types';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';

interface Props { stageId: StageId; audit: AuditEntry[]; adjustments: ScenarioAdjustments; currentView: string;
  accessToken?: string; onAudit: (entry: ChatAudit) => void | Promise<void>; onSource: (id: string) => void }
export default function ChatWidget(props: Props) {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null); const panel = useRef<HTMLElement>(null);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }, [open]);
  return <>
    <aside id="planning-assistant" ref={panel} role="dialog" aria-modal="false" aria-labelledby="assistant-title" className="chat-widget" hidden={!open} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className="chat-widget-header"><div><h2 id="assistant-title">Hala assistant</h2><p>{SCENARIO_STAGES[props.stageId].label.replace(/^Stage \d /, '')} · Planning support</p></div><button type="button" onClick={close} aria-label="Close assistant"><X size={20} /></button></header>
      <ChatPanel key={props.stageId} {...props} isOpen={open} onSource={id => { setOpen(false); props.onSource(id); }} />
    </aside>
    <button ref={launcher} type="button" className="chat-launcher" aria-controls="planning-assistant" aria-expanded={open} aria-label={open ? 'Close planning assistant' : 'Ask Hala, planning assistant'} onClick={() => open ? close() : setOpen(true)}><MessageSquare size={20} aria-hidden="true" /><span>{open ? 'Close assistant' : 'Ask Hala'}</span></button>
  </>;
}
