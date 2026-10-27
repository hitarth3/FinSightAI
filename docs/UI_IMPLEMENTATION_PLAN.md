# UI consistency implementation plan

This implements the structural priorities from UI_REVIEW.md. Work is split into
small commits so each stage can be reviewed or reverted independently. Existing
financial data APIs and authentication remain in use.

## 1. Shared layout and navigation

- Keep the restrained green workspace as the visual baseline.
- Give the shell sole ownership of page titles and descriptions; remove duplicate
  module titles and top-level Back buttons.
- Add shared section navigation and action-toolbar styling, readable control sizes,
  and consistent card/section spacing.
- Give top-level destinations hash routes so refresh and browser Back retain the
  selected page without requiring hosting rewrite configuration.
- Keep the demo's existing read-only boundaries.
- Check: TypeScript build; valid/default route handling; one page heading.

## 2. One assistant, card tools in Credit cards

- Remove the stacked Smart Card Advisor dashboard from AI assistant.
- Place My cards / Rewards / Compare navigation within Credit cards. Preserve the
  reward simulator, analytics and card recommendation components there.
- Replace the tiny chat card with a dedicated conversation area, starter prompts,
  context selector, multiline composer and clear retry state.
- Preserve both backend capabilities: finance-chat for financial overview and the
  existing card-advisor endpoint for card/reward questions; one renderer/composer.
- Persist conversations only in memory at workspace level, scoped to the signed-in
  user, across page navigation. Do not add financial chat text to browser storage.
- Protect New chat/context changes/unmount against late asynchronous replies.
- Remove unconditional Online / live-grounded claims and implementation jargon.
- Check: build, correct endpoint selection, failure/retry, reset and navigation.

## 3. Task-first expenses and stock reports

- Expenses: compact summary followed by Transactions / Analytics navigation;
  transaction history is the default; keep add/import workflows intact.
- Markets: place watchlist/research ahead of discovery tables; keep search and
  distinct price-refresh/report-refresh controls.
- Stock report: conclusion before methodology/news; make long evidence sections
  collapsible. Use Evidence confidence /100 consistently, including rankings.
- Replace clickable stock-name divs with keyboard-operable buttons.
- Check: build/tests; report fields, existing modals and empty/error states retained.

## 4. Visual consistency and verification

- Normalize essential microcopy to readable sizes in authenticated modules, reduce
  excess uppercase styling, and use shared toolbar/navigation patterns.
- Ensure the assistant composer wraps at phone widths and context controls remain
  accessible; retain focus indicators, reduced motion and native dialogs.
- Verify production build and frontend regression tests after integration.
- Visually inspect available local screens; explicitly record any authenticated,
  mobile or provider checks that cannot be exercised in this session.
- Commit final verification record and remaining follow-ups.

## Follow-ups outside this implementation slice

Durable chat history needs server-side storage and lifecycle decisions. Detailed
stock subroutes, contextual record chips and a sourced-answer evidence rail need
additional API/UI contracts. No simulated history or invented assistant sources
will be introduced to make those features appear complete.

## Completion log

- Plan written before application changes.

- Shared layout/navigation: implemented; build passed (6c1053a).
- Unified assistant and card tools: implemented (e922fe3); section type inference
  corrected in 4ed074b and production build passed.
- Task-first expenses/markets and collapsible report evidence: implemented;
  build passed (c3fccac).
- Typography, theme consolidation, compact expense summaries and route tests:
  implemented; production build and 16 frontend tests passed (3477519).
- Browser fixture: finance reply, separate card context, conversation retention
  across unmount/remount, provider failure and retry inspected using fictional
  responses. Desktop and 375px phone layouts inspected; mobile New chat wrapping
  corrected. This does not constitute a new live-provider or authenticated full-app
  end-to-end test. Backend APIs were not changed in this UI pass.

## Manual assistant regression fixture

Run the frontend dev server and open `/tests/assistant-preview.html`. The page
mounts the real assistant component with fictional delayed replies. It has
controls for theme, unmount/remount, and provider failure; no real financial data
or network provider is used. It is not part of the production app entry bundle.
Check New chat during a pending reply, context changes, Retry, Enter/Shift+Enter,
and restoration after Toggle page. Real authenticated account flows still need
an end-to-end browser check before deployment.
