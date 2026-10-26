import { ArrowUpRight, ChartNoAxesCombined, Check, Sparkles } from 'lucide-react';

export function BrandingSection() {
  return <div className="auth-brand-content">
    <div className="brand-lockup"><span className="brand-symbol"><ChartNoAxesCombined size={23} /></span><span>finsight<span className="brand-ai">AI</span></span></div>
    <div className="auth-brand-main"><span className="auth-kicker"><span /> A CLEARER FINANCIAL PICTURE</span><h1>Less guesswork.<br />More <em>insight.</em></h1><p>Your expenses, cards, and financial insights.<br />Together in one thoughtful workspace.</p>
      <div className="auth-preview"><div className="auth-preview-top"><span>Monthly cash flow</span><span className="preview-tag">ILLUSTRATION</span></div><div className="auth-preview-value">₹52,550 <span><ArrowUpRight size={14} /> Net cash flow</span></div><div className="preview-bars" aria-hidden="true">{[38, 55, 44, 68, 58, 80, 65, 88, 73, 97, 84, 100].map((height, i) => <div key={i} style={{ height: `${height}%` }} />)}</div><div className="preview-axis"><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span></div><div className="auth-preview-note"><Sparkles size={17} /><span>Turn everyday transactions into a clearer picture.</span></div></div>
      <div className="auth-feature-list">{['Track spending with context', 'Understand your credit', 'Explore AI-assisted insights'].map(text => <span key={text}><Check size={16} />{text}</span>)}</div>
    </div><div className="auth-brand-footer"><span>Built for everyday financial clarity.</span><span>FinSight AI</span></div>
  </div>;
}
