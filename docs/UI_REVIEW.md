# FinSight UI review and proposed layout

Review date: 27 October 2026. Scope: design and interaction review; no application UI changes made.

## Evidence and limits

Visually inspected the local sign-in screen, demo overview and demo expenses at desktop size. Reviewed source for the authenticated shell, expenses, cards, markets, both assistant chat components, report panel, theme styles and shared controls. The demo deliberately hides Markets and AI assistant and uses simplified expense/card views. Findings about those authenticated screens are source-backed; they are not claimed as authenticated browser tests. Mobile and dark-mode behavior still require visual verification. No user study or formal accessibility audit was performed.

## Main diagnosis

The product has two competing design systems. The shell/overview use a restrained green financial workspace. Feature modules retain gradients, glowing glass cards, uppercase micro-labels, extra headings and animated status badges. Changing colors alone will not resolve this: information architecture and component ownership need to be unified first.

The assistant is the clearest example. `DashboardPage.tsx:46` stacks FinanceAssistantCockpit above SmartCardAdvisor. The latter contains Reward Simulator, Reward Analytics, Card Upgrades and another AI Chat. The user must choose between two assistants without a clear account of their different scopes.

Keep the overview's restrained visual direction, primary navigation, shared theme tokens, existing native-dialog focus handling and visible keyboard focus. Improve text sizing and contrast even within the overview.

## Priority findings

### P0 — Give the assistant one purpose and one conversation

Evidence: `DashboardPage.tsx:46`, `advisor/SmartCardAdvisor.tsx:18`, `advisor/FinanceAssistantCockpit.tsx:167`.

The general assistant occupies a card with a message region capped at 280px. Reward tools below it compete for space. “AI Financial Assistant Cockpit,” “Centralized Intelligence Cockpit Active” and “Smart Card Advisor” create several product identities on one page.

Change: one AI assistant page, one conversation renderer and one composer. Move reward tools to Credit cards. Retain context-specific backend capabilities behind the shared chat interface; unifying the UI must not silently remove the card advisor's retrieval capabilities.

Acceptance: exactly one composer on the assistant page; no reward-tool dashboard below it; clear scope and sources for every answer.

### P0 — One page header per route

Evidence: the shell renders `page-intro` at `DashboardPage.tsx:44`, while ExpenseDashboard, CreditCardDashboard, MarketDashboard and SmartCardAdvisor render their own header and Back/Overview controls.

Change: shell owns page title, description, date filter and primary action. Modules provide content and action configuration. Use a back link only for a real child detail view, not every top-level destination. In particular, entering AI assistant from the sidebar should not expose a Back button that navigates to Credit cards.

Acceptance: one H1, one primary page action, one date scope, no competing module title.

### P0 — Make typography and controls consistent

Evidence: assistant and module components contain 8–10px text, uppercase tracking and opacity-reduced secondary labels; overview CSS also includes 9–11px text. `.primary-action` and GlassButton define separate control styles and sizing. `index.css` first declares neon cyan/purple themes and later overrides portions with green themes.

Change: consolidate theme definitions and use shared PageHeader, Button, Card, Tabs, Field, Stat and Status components. Proposed sizes: body/chat 14–16px; secondary labels 12–13px; section titles 18–20px; page titles 28–32px. Use 44px default controls, explicit compact variants where needed, and 16/24/32px spacing for internal padding/sections/page gutters. Prefer sentence case. Keep gradients and pulsing indicators out of routine data surfaces.

Acceptance: essential copy is not 8–10px; a primary action looks and behaves the same in every module; both themes use semantic tokens without dark-only overrides.

### P1 — Show real state, not decorative trust signals

Evidence: FinanceAssistantCockpit says “Online · Live Data grounded” unconditionally; AdvisorChat says “Online · RAG-Powered”; SmartCardAdvisor says “Advisor Online.”

Change: show actual data scope and timestamps, e.g. “Using recorded expenses · October 2026.” Loading, unavailable-provider and stale-data states must reflect requests. Replace engine/RAG/handshake language with user language. An API failure should expose Retry, not impersonate a normal assistant answer.

Acceptance: no fixed online badge; every error preserves the question and provides a meaningful recovery action.

### P1 — Put the main task above supporting analysis

Evidence: ExpenseDashboard places analytics and insight/merchant panels before ExpenseTable. MarketDashboard places indices and movers before the watchlist/research area. StockAnalysisPanel puts confidence detail and up to 12 headlines before the summary.

Change: prioritize transactions on Expenses; prioritize the watchlist for returning market users; put the report's short conclusion before methodology and article lists. Supporting evidence remains accessible through tabs/disclosures.

Acceptance: a user reaches the primary task without scrolling through unrelated analysis.

### P1 — Navigation and chat state must survive normal use

Evidence: view selection is local React state in DashboardPage; chat messages are component state. Leaving the assistant unmounts it. Browser Back/deep links do not model these destinations. Clear remains available while a response can be in flight.

Change: real routes for top-level pages and stock detail; retain conversations across route changes, with account-scoped persistence and explicit new-chat behavior. Ignore/abort responses belonging to cleared conversations. Show recent chats only once actual persistence exists.

Acceptance: browser Back returns to the prior page; changing pages preserves a conversation; clearing during a request cannot restore old messages.

### P1 — Keep finance terminology consistent

Evidence: the report detail displays evidence confidence `/100`, but market rankings render `confidence%`. The ranking sentiment sort is alphabetical. The report also exposes raw component keys through underscore replacement.

Change: use “Evidence confidence” and `/100` everywhere, with a concise quality explanation. Present human-readable contributions such as “Price freshness · 25/25.” Use an explicitly defined sentiment order if sortable. Label BUY/SELL/HOLD as technical signals consistently.

Acceptance: the same metric has the same name, unit and explanation in cards, rankings, detail views and chat.

### P2 — Complete responsive and accessibility treatment

Source-backed risks: assistant composer is a single-line input plus two non-wrapping actions; assistant tabs use horizontal overflow; watchlist company navigation is a clickable div; chat does not expose a dedicated live message region. These require viewport/keyboard validation, not assumptions of observed failure.

Change: multiline composer with an accessible label; Enter to send and Shift+Enter for newline; clear loading announcements; semantic links/buttons for stock navigation; keyboard-operable tabs with selected state. Keep one main scroll region where possible. On phones, collapse context panels and keep the composer visible above the keyboard. Preserve the existing native dialog behavior.

Acceptance: test at 375/768/1440px, light/dark themes, keyboard-only navigation, 200% zoom and reduced motion. No clipped primary actions or essential information available only by color/hover.

## Where everything should live

Keep five primary sidebar destinations: Overview, Expenses, Credit cards, Markets, AI assistant. Keep appearance/account controls in the top bar/account area. Do not add more top-level “AI” destinations for individual tools.

### Overview — “What needs my attention?”

Top: title, actual period selector, one action such as Add expense. Then four consistent metrics: income, spending, net cash flow and credit outstanding. Middle: cash-flow chart and spending breakdown. Bottom: recent transactions and a compact attention list. Each attention item links to its owning module. A contextual “Ask about this” opens the shared assistant with the selected scope.

Replace the generic motivational card with actionable information when there is real evidence, such as an approaching card due date or a category change. Do not invent alerts to fill space.

### Expenses — “Find and manage transactions”

Header actions: Add expense (primary), Import statement (secondary). Below: compact summary strip, then the transaction toolbar (period, search, category, account) and transaction table. Use Transactions / Analytics tabs if analytics is substantial. Merchant breakdown and insights belong under Analytics, not ahead of the transaction list. Keep receipt/statement import review in the existing guided modal flow.

### Credit cards — “Manage cards and choose the right one”

Header action: Add card. Tabs: My cards / Rewards / Compare. My cards contains balances, limits, utilization and due dates. Rewards contains Best card for a purchase, reward analytics and reward rules. Compare contains upgrade recommendations with fees and eligibility caveats. “Ask about this card” passes the card context into the unified assistant; do not add a second full chat.

### Markets — “Follow a stock, then inspect its research”

Header: stock search, last quote update and Refresh prices. A compact index strip follows. Tabs: Watchlist / Discover. Watchlist uses a master/detail layout on desktop: a 280–320px watchlist at left and the selected stock at right. Discover holds gainers, losers and broader market information.

Selected-stock header: symbol/company, price/change and quote time. Tabs: Price / Research / News. Research order: short summary; technical signal, trend strength, news sentiment and evidence confidence; price levels; collapsible methodology. News contains the dated articles and per-headline sentiment. On mobile, list selection opens a full-width detail view with a clear return control.

The sample news feed should remain in a clearly separate demo/example experience rather than compete with live report evidence on an authenticated market workspace. Price refresh and report regeneration need distinct labels because they update different data.

### AI assistant — “Understand my finances and take the next step”

Desktop layout, from left to right:

- Existing app sidebar (about 224–240px).
- Main assistant workspace: compact header, context strip, conversation, bottom composer.
- Optional evidence/context rail (about 280–320px), shown only when an answer has supporting records; collapsible at narrower widths.

Conversation column: readable width around 720–800px, body text 15–16px, most of the available viewport height. Avoid a 280px embedded scroller inside a long dashboard. A compact “New chat” action belongs in the header. Add a history drawer only when conversations are actually persisted.

Empty state: “What would you like to understand?” with three useful prompts: “Explain my spending this month,” “Which card should I use?” and “Summarize my watchlist.” Show the available data scope and selected period before submission.

Composer: multiline field, Send as the primary control. Make “Review my finances” a starter prompt or secondary action; it should not permanently compete with Send. Enter sends, Shift+Enter adds a line. Preserve drafts during requests; provide a stop action only if cancellation is implemented.

Answer structure: direct answer first; compact supporting numbers when useful; expandable sources/records; suggested follow-up action linking to the owning module. Use one safe Markdown renderer for both backend capabilities rather than different handwritten formatting. Keep provider jargon out of the main flow.

Contextual entry example: clicking “Ask about this” on the TCS report opens this same assistant with a visible TCS context chip and report date. Do not silently send unrelated account records. Switching context should be explicit.

## Implementation order and checks

1. **Shared foundation:** consolidate theme tokens and shared controls; introduce the shell-owned PageHeader; remove duplicate top-level headers. Check overview/expenses/cards for matching spacing and button sizes.
2. **Assistant architecture:** move reward tools to cards, unify the chat surface, fix conversation retention and reset/request races. Check one composer, one identity and actual provider-state messaging.
3. **Task-first pages:** put transactions first, watchlist/research together, and summary ahead of report evidence. Fix confidence terminology in rankings and details together.
4. **Responsive and interaction QA:** verify the viewport/theme/keyboard matrix above, long answers, empty data, provider failure, stale report and large transaction lists.

Keep each step a separate commit. Preserve current data APIs unless a specific interaction needs new state or metadata. Acceptance is a coherent end-to-end flow, not just matching card colors.
