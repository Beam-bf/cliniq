import { useEffect, useRef, useState } from 'react';
import { inputError, makeChatAudit, offlineAnswer } from '@/chat/core';
import type { ChatAnswer, ChatAudit, ChatRequest, ChatTurn } from '@/chat/core';
import type { AuditEntry, StageId } from '@/types';
import type { ScenarioAdjustments } from '@/planning/scenarioPlanning';
import { supabase } from '@/lib/supabase';

interface Props { stageId: StageId; audit: AuditEntry[]; adjustments: ScenarioAdjustments; currentView: string; isOpen: boolean;
  accessToken?: string; onAudit: (entry: ChatAudit) => void | Promise<void>; onSource: (id: string) => void }
interface Message { question: string; response: ChatAnswer }
const suggestions: Record<StageId, string[]> = {
  baseline: ['What does the forecast show?', 'Which routine tasks could be delegated?'],
  'winter-surge': ['What waiting-time risks appear in winter?', 'What coordinator conflicts are flagged?'],
  'specialist-leave': ['What does the forecast show during specialist leave?', 'What tele-pooling is proposed?'],
};

export default function ChatPanel({ stageId, audit, adjustments, currentView, isOpen, accessToken, onAudit, onSource }: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const wasBusy = useRef(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && messages.length) messageEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, isOpen]);
  useEffect(() => {
    if (isOpen && wasBusy.current && !busy) composer.current?.focus();
    wasBusy.current = busy;
  }, [busy, isOpen]);
  async function send(text = question) {
    if (locked.current) return;
    const problem = inputError(text);
    if (problem) { setError(problem); return; }
    locked.current = true; setBusy(true); setError(null);
    const history: ChatTurn[] = messages.slice(-2).flatMap(message => [
      { role: 'user', content: message.question.slice(0, 600) }, { role: 'assistant', content: message.response.answer.slice(0, 600) },
    ]);
    const payload: ChatRequest = { question: text.trim(), scenarioId: stageId, history, adjustments, currentView,
      recentAudit: audit.slice(0, 5).map(({ stage, agent, decision }) => ({ stage, agent, decision })) };
    try {
      let answer: ChatAnswer;
      try {
        if (supabase && !accessToken) throw new TypeError('Demo uses offline answers. Sign in for the connected assistant.');
        const result = await fetch('/api/chat', { method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
        if ([400, 401, 403, 413, 415, 429].includes(result.status)) {
          const body = await result.json(); throw new Error(body.error ?? 'Request rejected.');
        }
        if (!result.ok || !result.headers.get('Content-Type')?.includes('application/json')) throw new TypeError('Service unavailable');
        answer = await result.json();
        if (!['live', 'offline'].includes(answer.mode) || typeof answer.answer !== 'string' || !Array.isArray(answer.sourceIds)) throw new TypeError('Invalid response');
      } catch (failure) {
        if (failure instanceof Error && !(failure instanceof TypeError) && failure.name !== 'TimeoutError' && failure.name !== 'AbortError') throw failure;
        answer = offlineAnswer(payload, supabase && !accessToken ? 'Demo mode uses offline templates. Sign in for the connected assistant.' : 'The chat endpoint is unavailable; using local offline templates.');
      }
      setMessages(current => [...current, { question: payload.question, response: answer }]);
      setQuestion('');
      await onAudit(makeChatAudit(payload, answer));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to answer. Try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <div className="chat-content" aria-busy={busy}>
      <div className="chat-scroll-area">
      {messages.length === 0 && <div className="chat-welcome"><p className="eyebrow">A little help with planning</p><h3>What would you like to explore?</h3><p>I can explain your current scenario, its findings, and the available policy extracts.</p><p className="field-note">Fictional aggregate data only. Please leave out personal information.</p></div>}
      {messages.length > 0 && <button className="text-button chat-new" disabled={busy} onClick={() => { setMessages([]); setError(null); }}>New conversation</button>}
      <ol className="chat-messages" aria-label="Chat messages" aria-live="polite" aria-relevant="additions">
        {messages.map((message, index) => <li key={index}>
          <p className="chat-user-message"><span className="sr-only">You: </span>{message.question}</p>
          <div className="chat-assistant-message"><span className="chat-mode">{message.response.mode === 'offline' ? 'Offline mode · template answer' : 'Live mode · LLM answer'}</span>
          <p className="whitespace-pre-wrap">{message.response.answer}</p>
          {message.response.notice && <p className="chat-notice">{message.response.notice}</p>}
          <div className="chat-citations">{message.response.sourceIds.map(id => <a key={id} href={`#evidence?source=${id}`} onClick={event => { event.preventDefault(); onSource(id); }}>{id}</a>)}</div></div>
        </li>)}
      </ol>
      {messages.length < 2 && <div className="chat-suggestions">{suggestions[stageId].map(text => <button key={text} type="button" disabled={busy} onClick={() => { setQuestion(text); void send(text); }}>{text} <span aria-hidden="true">↗</span></button>)}</div>}
      <div ref={messageEnd} />
      </div>
      <form onSubmit={event => { event.preventDefault(); void send(); }} className="chat-composer">
        <label htmlFor="planning-question" className="sr-only">Planning question (600 characters maximum)</label>
        <div className="chat-input-row"><textarea ref={composer} id="planning-question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} placeholder="Ask about this scenario…" maxLength={600} disabled={busy} aria-describedby="chat-state" />
        <button disabled={busy || !question.trim()} className="primary-button" aria-label="Send question">{busy ? '…' : 'Send'}</button></div>
        <p id="chat-state" role="status" className={error ? 'form-error' : 'field-note'}>{error ?? (busy ? 'Checking your scenario…' : 'Read-only · Enter to send, Shift+Enter for a new line')}</p>
      </form>
  </div>;
}
