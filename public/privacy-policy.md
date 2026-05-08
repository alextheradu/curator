# Privacy Policy

**Curator — FRC AI Assistant**
**Last updated: May 8, 2026**

## 1. Overview

This Privacy Policy explains how Curator ("the Service", "we", "us") collects, uses, and protects information about you when you use our AI-powered FRC assistant. We are committed to being transparent and collecting only what is necessary to operate the Service.

## 2. Information We Collect

### 2a. Guests (unauthenticated users)
- A session cookie tracking whether you have accepted the Terms of Service for the current browser session
- A cookie counting the number of messages sent in the current session (used to enforce the guest message limit)
- A cookie recording your cookie-consent choice (`necessary` or `accepted`)
- Optional sidebar preference cookies recording whether the sidebar is open and what width you chose
- Browser cache entries created by the app's installable web-app/service-worker layer for offline support and faster reloads
- Your chat messages (held in browser `localStorage` only — never sent to our servers beyond the API call to generate a response)

### 2b. Authenticated users (Google sign-in)
- **From Google OAuth:** your name, email address, and profile picture URL
- **Onboarding profile:** your preferred name and optional FRC team number
- **Conversation history:** all messages you send and receive, stored in our database so they persist across devices
- **Projects:** project names, icon/color choices, chat-to-project organization, and hidden AI-generated project context summaries derived from chats inside each project
- **Moderation records:** if your account is suspended, we store the affected email address, suspension status, timestamp, and any admin-entered reason tied to that action
- **Sharing preferences:** whether a conversation has been marked public by you
- **Admin-authored blog content:** if you are an admin, blog post drafts and publication metadata you create may be stored in our database and, when published, shown publicly with your preferred name (or your account name if no preferred name is set)
- **Account settings:** your saved default chat style preference (`Veteran` or `Rookie`), onboarding completion timestamp, and Terms of Service acceptance timestamp
- **Account metadata:** account creation date, last active date

### 2c. All users
- **Chat messages and AI processing:** message content is sent to OpenRouter (our LLM provider) for processing. Depending on the model/provider OpenRouter routes your request to (especially some free models), prompt and response data may be logged, retained, or used by that provider for abuse monitoring, service improvement, or model training under their terms. Do not submit secrets or highly sensitive information in chats. See OpenRouter's privacy policy at openrouter.ai/privacy.
- **Team context lookups:** if your saved team number is available and a chat needs live event context, relevant query data is sent to The Blue Alliance through our server-side integration.
- **Public shared chats:** if an authenticated user chooses to make a chat public, that conversation becomes accessible to anyone with the chat URL until the owner turns sharing off or deletes the chat.
- **Search queries:** if web search is triggered, including when you enable Deep search, your query is sent to LangSearch. Deep search may run multiple web searches until enough context is gathered or the search provider rate-limits the request. See LangSearch's privacy policy for details.
- **Response feedback:** if you use response feedback controls, we store the feedback type, message ID, account ID if signed in, IP address, and timestamp in operational logs so admins can improve retrieval and answer quality.
- **Support requests:** if you use the support form, we collect the details you submit, which may include your name, email address, subject, message, current page path, browser user agent, IP address, and your account ID if signed in.
- **Moderation flags:** authenticated user messages may be automatically scanned for profanity, harassment, threats, sexual content, or similar inappropriate language. Matching messages can create an internal moderation report containing the message ID, conversation ID, account ID, matched terms, and flag reason for admin review.
- **Error and performance telemetry:** we use Sentry to capture application errors, request context, performance traces, diagnostic metadata such as URLs, browser/device information, and account identifiers when available, and browser Session Replay data for debugging. Replay traffic is tunneled through our own app domain to reduce losses caused by browser blocking of direct Sentry ingestion requests.
- **Cookie-free performance analytics:** Cloudflare Web Analytics may collect aggregate pageview and performance metrics, including navigation timing and Core Web Vitals-style measurements, using a lightweight browser beacon that does not rely on advertising cookies.
- **Operational logs:** we store application logs for support, abuse prevention, debugging, and reliability work. These logs can include request paths, IP address, account ID, and error details.
- **Rate-limit metadata:** we store per-scope counters keyed to your account ID or network metadata so we can slow abusive traffic and protect the Service.
- **Search indexing notifications:** when public Curator pages are added or updated, we may send the affected page URLs to IndexNow-participating search engines so they can recrawl those pages faster.
- **Analytics usage data:** if you accept analytics cookies, we use Google Analytics 4 to collect aggregated usage data (for example, page views, device/browser information, approximate region, and interaction events) to understand and improve the Service.
- **Server logs:** standard web server request logs (IP address, timestamp, user agent) retained for up to 30 days.

## 3. How We Use Your Information

- To provide and improve the Service
- To authenticate you and persist your conversation history
- To organize your saved chats into personal projects and apply hidden project-scoped context only within those projects
- To store and apply your saved preferred name, optional team number, onboarding status, account-level chat style preference, and account-level Terms of Service acceptance
- To honor your choice to publish or unpublish shared chat links
- To let admins draft, edit, publish, and remove public blog posts about Curator updates
- To detect, review, and act on profanity or other inappropriate content through manual reports and automatic moderation flags
- To enforce the guest message limit and Terms of Service acceptance
- To record, honor, and later update your cookie-consent preference
- To generate AI responses grounded in FRC documentation
- To collect optional response feedback and identify retrieval or citation quality issues
- To enrich applicable answers with live event context from The Blue Alliance when your saved team number is available
- To respond to support requests and account/privacy questions
- To generate on-demand account data exports when you request them from Settings
- To enforce rate limits and investigate abuse or reliability issues
- To monitor application errors, reliability, and performance
- To monitor performance and usage trends through aggregate analytics

We do **not** sell your data, use it for advertising, or share it with third parties except as described in Section 4.

## 4. Third-Party Services

| Service | Purpose | Their Privacy Policy |
|---------|---------|---------------------|
| Google OAuth | Authentication | policies.google.com/privacy |
| OpenRouter | LLM routing and inference; upstream model providers may process and retain prompts/responses under their own terms | openrouter.ai/privacy |
| The Blue Alliance | Live team, event, rankings, and match context | thebluealliance.com/privacy |
| LangSearch | Web search | (see LangSearch docs) |
| Sentry | Error monitoring, performance tracing, logs, and Session Replay | sentry.io/privacy/ |
| Cloudflare Web Analytics | Cookie-free site analytics and performance measurements | cloudflare.com/privacypolicy/ |
| Google Analytics | Aggregated usage analytics and performance insights | policies.google.com/privacy |
| IndexNow | Search engine change notifications for public page URLs | indexnow.org/documentation |
| MinIO (self-hosted) | Document storage | Self-hosted, no third party |

## 5. Data Storage

- User data and conversation history are stored in a self-hosted PostgreSQL database.
- Project metadata, chat project assignments, and hidden project context summaries are stored in PostgreSQL with your account data.
- Saved onboarding fields, including preferred name, optional team number, onboarding completion time, and Terms of Service acceptance time, are stored in the same PostgreSQL account record.
- Public/private sharing status for authenticated conversations is stored alongside the conversation record in PostgreSQL.
- Admin-authored blog posts, publication timestamps, and the associated author account reference are stored in PostgreSQL.
- Moderation reports, matched-term metadata, and banned-email records are stored in PostgreSQL.
- Support requests, application logs, and rate-limit counters are stored in PostgreSQL.
- Response feedback is stored in PostgreSQL as an operational log entry.
- The installable web app stores a browser-managed offline cache of selected app shell files, icons, and a small set of public pages on your device.
- PDF documents, including season-specific references and general team reference files, are stored in a self-hosted MinIO instance.
- Vector embeddings are stored in a self-hosted Qdrant instance.
- Short-lived server caches may hold copies of public pages and admin read responses for performance until those caches expire or are invalidated.
- No user data is stored on third-party cloud storage.

## 6. Data Retention

- **Guest data:** stored only in your browser's `localStorage`. Cleared when you clear your browser data.
- **Offline app cache:** stored in your browser until the browser clears site data, the service worker replaces the cache during an update, or you manually remove the site's stored data.
- **Authenticated user data:** retained for as long as your account exists. This includes saved onboarding profile fields, chat-mode preference, Terms of Service acceptance state, and conversation history. You may delete your account and all associated data at any time from the Settings page.
- **OpenRouter/upstream model-provider data:** prompts and model outputs sent for inference may be retained by OpenRouter and/or the selected upstream model provider according to their own retention and training policies (which can vary by model tier, including free models).
- **Projects:** retained for as long as your account exists unless you delete a project. Deleting a project removes its project metadata and hidden summary while returning its chats to normal history.
- **Moderation data:** moderation reports and banned-email records are retained until they are manually cleared, no longer needed for safety or abuse review, or your account and related moderation history are deleted.
- **Account export packages:** generated on demand from your current account data when you request an export from Settings and not stored by the Service after the response is delivered.
- **Public shared chats:** remain publicly accessible until you make the chat private again or delete it.
- **Admin-authored blog posts:** retained until they are deleted or unpublished by an admin; published posts remain publicly accessible until removed or replaced.
- **Support requests and application logs:** retained until they are manually deleted or no longer needed for support, security, or operational debugging.
- **Response feedback:** retained until it is manually deleted or no longer needed for product quality review.
- **Rate-limit counters:** retained for up to 7 days before cleanup.
- **Server logs:** retained for 30 days, then deleted.
- **Analytics data:** retained according to Google Analytics property retention settings configured by the operator.

## 7. Cookies

We use the following cookies:
- `tos_accepted` — records that a guest browser session has accepted the Terms of Service (session cookie)
- `guest_message_count` — tracks number of guest messages sent
- `cookie_consent` — records whether you chose necessary-only cookies or accepted analytics cookies
- `sidebar_state` — stores whether the app sidebar is expanded or collapsed
- `sidebar_width` — stores your chosen sidebar width
- `authjs.session-token` or `__Secure-authjs.session-token` — Auth.js session JWT (authenticated users only)
- `authjs.csrf-token` — protects the Google sign-in flow from cross-site request forgery
- `authjs.callback-url` — remembers where to return you after sign-in
- `_ga`, `_ga_*` — Google Analytics cookies used to distinguish users/sessions and measure site usage, but only after you accept analytics cookies

We do not use advertising cookies.

Curator also stores local browser values for cookie-banner state and chat options, including `curator:cookie-consent`, `curator:factCheck`, `curator:searchMode`, and the legacy `curator:deepSearch` value.

You can change your analytics choice later from the in-app cookie preferences control.

## 8. Children's Privacy

The Service is intended for FRC team members, mentors, and coaches. We do not knowingly collect data from children under 13. If you believe a child has provided us personal information, contact us and we will delete it.

## 9. Your Rights

You have the right to:
- Access the data we hold about you
- Delete your account and all associated data
- Make a shared chat private again or delete it to remove public access
- Export your account data, including chats, project metadata, hidden project summaries, saved onboarding/account settings, and support requests associated with your signed-in account

We may retain limited moderation records when reasonably necessary to enforce the Terms, investigate abuse, or document account suspensions.

These actions are available from the Settings page once logged in.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify authenticated users of material changes via the app.

## 11. Contact

For privacy questions or data deletion requests, use the Support section in Settings, the [Support page](/support), open an issue on the project repository, or contact the operator directly.
