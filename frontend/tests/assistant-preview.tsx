// Manual browser fixture. Only served by the Vite dev server; not imported by the app.
// Uses fictional responses and never submits account data to a provider.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FinanceAssistantCockpit, emptyAssistantWorkspace } from '../src/components/advisor/FinanceAssistantCockpit';
import '../src/index.css';

let fail = false;
window.fetch = async (input) => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  if (fail) return Response.json({ detail: 'Fixture provider unavailable' }, { status: 503 });
  return Response.json({ data: { reply: `### ${String(input).endsWith('/chat') ? 'Card rewards' : 'Financial overview'}\nThis is a **fictional test response**.\n- Recorded spending is ₹12,000.\n- Review the source transactions before making a decision.` } });
};
function Preview() {
  const [workspace, setWorkspace] = useState(emptyAssistantWorkspace);
  const [visible, setVisible] = useState(true);
  const [dark, setDark] = useState(false);
  return <main className="dashboard-main" style={{ maxWidth: 1100 }}>
    <div className="module-toolbar" style={{ marginBottom: 20 }}>
      <strong>UI test fixture · fictional responses</strong>
      <div className="module-actions">
        <button onClick={() => { setDark(!dark); document.documentElement.classList.toggle('light-professional', dark); }}>Toggle theme</button>
        <button onClick={() => setVisible(!visible)}>Toggle page</button>
        <label><input type="checkbox" onChange={event => { fail = event.target.checked; }} />Simulate failure</label>
      </div>
    </div>
    {visible ? <FinanceAssistantCockpit workspace={workspace} setWorkspace={setWorkspace} /> : <p>Another page. Return to verify that the conversation is retained.</p>}
  </main>;
}
document.documentElement.classList.add('light-professional');
createRoot(document.getElementById('root')!).render(<Preview />);
