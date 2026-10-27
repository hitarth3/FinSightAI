import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Send, Plus, Sparkles } from 'lucide-react';
import { API_BASE, apiFetch } from '../../services/apiClient';
import { GlassButton } from '../ui/GlassButton';

export type AssistantScope = 'finance' | 'cards';
export interface AssistantMessage { role: 'user' | 'assistant'; content: string }
export interface AssistantWorkspace {
  scope: AssistantScope;
  conversations: Record<AssistantScope, AssistantMessage[]>;
  draft: string;
}
export const emptyAssistantWorkspace = (): AssistantWorkspace => ({ scope: 'finance', conversations: { finance: [], cards: [] }, draft: '' });

// Render text safely through React; no model-generated HTML is injected.
function MessageContent({ content }: { content: string }) {
  return <div className="assistant-prose">{content.split('\n').map((line, index) => {
    const text = line.replace(/^#{1,6}\s+/, '');
    const parts = text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
    return /^#{1,6}\s/.test(line) ? <h3 key={index}>{parts}</h3> : <p key={index}>{parts || '\u00a0'}</p>;
  })}</div>;
}

export function FinanceAssistantCockpit({ workspace, setWorkspace }: {
  workspace: AssistantWorkspace; setWorkspace: Dispatch<SetStateAction<AssistantWorkspace>>;
}) {
  const { scope, conversations, draft } = workspace;
  const messages = conversations[scope];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  useEffect(() => { const area = scrollArea.current; if (area) area.scrollTop = area.scrollHeight; }, [messages, busy]);

  const cancel = () => { sequence.current++; controller.current?.abort(); setBusy(false); setError(null); };
  const changeScope = (next: AssistantScope) => { cancel(); setWorkspace(prev => ({ ...prev, scope: next })); };
  const reset = () => { cancel(); setWorkspace(prev => ({ ...prev, draft: '', conversations: { ...prev.conversations, [scope]: [] } })); };
  const send = async (question: string, retry = false) => {
    if (!question.trim() || busy) return;
    const id = ++sequence.current;
    const activeScope = scope;
    const history = retry ? messages.slice(0, -1) : messages;
    const abort = new AbortController(); controller.current = abort;
    if (!retry) setWorkspace(prev => ({ ...prev, draft: '', conversations: { ...prev.conversations,
      [activeScope]: [...history, { role: 'user', content: question.trim() }] } }));
    setBusy(true); setError(null);
    try {
      const response = await apiFetch(`${API_BASE}/api/advisor/${activeScope === 'cards' ? 'chat' : 'finance-chat'}`, {
        method: 'POST', signal: abort.signal, timeoutMs: 60_000,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('finsight_access_token') || ''}` },
        body: JSON.stringify({ message: question.trim(), history: history.slice(-4).map(item => ({ ...item, content: item.content.slice(0, 8000) })), ...(activeScope === 'finance' ? { is_analyze: false } : {}) }),
      });
      const json = await response.json();
      if (!response.ok || typeof json.data?.reply !== 'string') throw new Error('Unable to load a reply.');
      if (id !== sequence.current) return;
      setWorkspace(prev => ({ ...prev, conversations: { ...prev.conversations,
        [activeScope]: [...prev.conversations[activeScope], { role: 'assistant', content: json.data.reply }] } }));
    } catch (err) {
      if (id === sequence.current && !abort.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load a reply.');
    } finally {
      if (id === sequence.current) { setBusy(false); composer.current?.focus(); }
    }
  };
  const starters = scope === 'finance'
    ? ['Explain my spending this month', 'Review my financial overview', 'Summarize my recorded investments']
    : ['Which card should I use for groceries?', 'Explain my card rewards', 'How can I improve my card utilization?'];
  const unanswered = messages.at(-1)?.role === 'user' && !busy;
  return <section className="assistant-workspace" aria-label="Financial assistant">
    <header className="assistant-toolbar">
      <label className="assistant-context">Conversation context
        <select value={scope} onChange={event => changeScope(event.target.value as AssistantScope)}>
          <option value="finance">My finances</option><option value="cards">Cards and rewards</option>
        </select>
      </label>
      <GlassButton variant="secondary" onClick={reset}><Plus size={16} />New chat</GlassButton>
    </header>
    <p className="assistant-context-note">{scope === 'finance' ? 'Questions about your recorded expenses, cards and investments.' : 'Questions about your cards, reward rules and purchase options.'} Answers depend on available account data.</p>
    <div ref={scrollArea} className="assistant-conversation" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
      {!messages.length ? <div className="assistant-welcome">
        <Sparkles size={28} aria-hidden="true" /><h2>What would you like to understand?</h2>
        <p>Start with a question, or choose one below.</p>
        <div className="assistant-starters">{starters.map(prompt => <button key={prompt} onClick={() => void send(prompt)}>{prompt}</button>)}</div>
      </div> : messages.map((message, index) => <article key={index} className={`assistant-message ${message.role}`}>
        <span className="assistant-message-author">{message.role === 'user' ? 'You' : 'FinSight'}</span>
        <MessageContent content={message.content} />
      </article>)}
      {busy && <p className="assistant-thinking" role="status">Reviewing your question…</p>}
      {unanswered && <div className="assistant-error" role={error ? 'alert' : 'status'}>
        <p>{error || 'This question has not received a reply.'}</p>
        <GlassButton variant="secondary" onClick={() => void send(messages[messages.length - 1].content, true)}>Retry question</GlassButton>
      </div>}
    </div>
    <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void send(draft); }}>
      <label className="sr-only" htmlFor="assistant-question">Your question</label>
      <textarea id="assistant-question" ref={composer} value={draft} rows={2} maxLength={4000}
        placeholder="Ask about your finances…" onChange={event => setWorkspace(prev => ({ ...prev, draft: event.target.value }))}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }} />
      <div className="assistant-composer-footer"><span>Enter to send · Shift + Enter for a new line</span>
        <GlassButton type="submit" disabled={busy || !draft.trim()}><Send size={16} />Send</GlassButton>
      </div>
    </form>
    <p className="assistant-footnote">Informational assistance. Verify important decisions against your records. Chats stay in this workspace session.</p>
  </section>;
}
