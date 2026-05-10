# Curator Update Notes

Curator has a new round of chat, search, admin, and quality improvements.

## Faster Chat By Default

- Normal chat now starts faster by skipping the tool-planning/search loop unless a source-search mode is enabled.
- The composer menu now supports three search modes:
  - **Fast**: answer quickly from available context.
  - **Balanced**: run a shorter PDF, web, and live-data pass before answering.
  - **Deep search**: search more broadly across PDFs, web results, and live data before answering.
- The three-dot composer menu stays open when search or fact-check options are selected.

## More Transparent Answers

- Assistant replies can now show a search activity panel with:
  - PDF searches
  - web searches
  - The Blue Alliance live-data calls
  - result counts
  - rate-limit or time-budget stops
- Citations now appear in a **Sources used** strip before the answer so rule and source-backed responses are easier to verify.
- Search activity can stream while the assistant is still working, so users can see what Curator is checking before the final answer lands.

## Search And Agent Improvements

- Deep search can run more tool iterations with a finite budget.
- PDF search can return up to 50 chunks in deep mode.
- Web search can continue across multiple searches until the model has enough context, the request is cancelled, the budget is reached, or the provider rate-limits the request.
- Tool calls from the same model turn can run concurrently.
- Web-search rate limits are detected and surfaced to the model so Curator continues from gathered sources instead of repeatedly retrying.

## Feedback And Quality Controls

- Assistant messages now include quick feedback controls:
  - helpful
  - not helpful
  - bad citation
  - missed source
- Feedback is stored as operational quality data for admin review.
- A new admin feedback page lists recent response feedback and summary counts.
- A chat eval scaffold was added so Curator can start tracking answer quality across Fast, Balanced, and Deep modes.

## Better First-Run Experience

- Onboarding now includes default search-mode selection.
- Settings now includes a browser-level default search mode.
- The empty chat screen now groups quick starts by category:
  - Rules
  - Strategy
  - Build
  - Awards

## Sharing Improvements

- Shared read-only chats now include an **Ask this** action that opens Curator with the first prompt prefilled.

## Admin And Operations Improvements

- Admin Ops now includes retrieval health cards for:
  - document count
  - described documents
  - stored chunks
  - Qdrant vector alignment
- Chat requests now record lightweight timing and source-count logs for operational visibility.

## Performance And Polish

- Fixed-size logo and avatar images now include explicit image sizing hints.
- The homepage remains statically generated while still supporting shared prompt prefill on the client.
- Terms of Service and Privacy Policy were updated for search modes, response feedback, and local chat-option storage.

## Developer Notes

- Added `scripts/run-chat-evals.mjs`.
- Added `evals/chat-evals.json`.
- Added `npm run eval:chat`.
- Added focused tests for chat search options and composer option rendering.
