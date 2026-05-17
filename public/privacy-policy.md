# Privacy Policy

**Curator — FRC AI Assistant**
**Last updated: May 17, 2026**

---

## 1. Overview

This Privacy Policy explains how Curator ("the Service", "we", "us") collects, uses, and protects information about you when you use our AI-powered FRC assistant. We are committed to being transparent and collecting only what is necessary to operate the Service.

**We do not sell your personal information. We do not share your personal information with third parties for cross-context behavioral advertising or any advertising purpose.**

---

## 2. Information We Collect

### 2a. Guests (unauthenticated users)

- A session cookie tracking whether you have accepted the Terms of Service for the current browser session
- A cookie counting the number of messages sent in the current session (used to enforce the guest message limit)
- A cookie recording your cookie-consent choice (`necessary` or `accepted`)
- Optional sidebar preference cookies recording whether the sidebar is open and what width you chose
- Browser cache entries created by the app's installable web-app/service-worker layer for offline support and faster reloads
- Your chat messages (held in browser `localStorage` only — never sent to our servers beyond the API call to generate a response)

### 2b. Authenticated users (Google or Apple sign-in)

- **From Google OAuth:** your name, email address, and profile picture URL
- **From Apple Sign-In:** your name and email address (Apple only sends your name on the very first sign-in; profile pictures are not provided by Apple)
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
- **Moderation flags:** authenticated user messages may be automatically scanned for profanity, harassment, threats, sexual content, or similarly inappropriate language. Matching messages can create an internal moderation report containing the message ID, conversation ID, account ID, matched terms, and flag reason for admin review.
- **Error and performance telemetry:** we use Sentry to capture application errors, request context, performance traces, diagnostic metadata such as URLs, browser/device information, and account identifiers when available, and browser Session Replay data for debugging. Replay traffic is tunneled through our own app domain. Sentry acts as a data processor on our behalf and does not sell or share your personal data. See Section 4 for details.
- **Cookie-free performance analytics:** Cloudflare Web Analytics may collect aggregate pageview and performance metrics, including navigation timing and Core Web Vitals-style measurements, using a lightweight browser beacon that does not rely on cookies or advertising identifiers.
- **Operational logs:** we store application logs for support, abuse prevention, debugging, and reliability work. These logs can include request paths, IP address, account ID, and error details.
- **Rate-limit metadata:** we store per-scope counters keyed to your account ID or network metadata so we can slow abusive traffic and protect the Service.
- **Search indexing notifications:** when public Curator pages are added or updated, we may send the affected page URLs to IndexNow-participating search engines so they can recrawl those pages faster.
- **Analytics usage data (consent required):** if you explicitly accept analytics cookies through the cookie consent banner, we use Google Analytics 4 to collect aggregated usage data — for example, page views, device/browser information, approximate region, and interaction events — to understand and improve the Service. Google Analytics does not load until you actively accept. If you decline or ignore the banner, no GA cookies are set and no GA data is collected. You can change this choice at any time from the in-app cookie preferences control.
- **Server logs:** standard web server request logs (IP address, timestamp, user agent) retained for up to 30 days.

---

## 3. How We Use Your Information

- To provide and improve the Service
- To authenticate you via Google or Apple and persist your conversation history
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
- To monitor application errors, reliability, and performance through Sentry
- To monitor performance and usage trends through aggregate analytics, only after you consent

**We do not use your data for advertising. We do not sell your data. We do not share your data with third parties for cross-context behavioral advertising.**

---

## 4. Third-Party Services

The following services receive data as part of operating the Service. None of these services receive your data for advertising purposes, and none are permitted to sell data we share with them under our agreements.

| Service | Purpose | Data they receive | Their Privacy Policy |
|---|---|---|---|
| Google OAuth | Authentication (web and iOS) | Email, name, profile picture | policies.google.com/privacy |
| Apple Sign-In | Authentication (iOS) | Email, name (first sign-in only) | apple.com/legal/privacy |
| OpenRouter | LLM routing and inference | Chat message content; upstream model providers may process and retain prompts under their own terms | openrouter.ai/privacy |
| The Blue Alliance | Live team, event, and match context | Team number, query context | thebluealliance.com/privacy |
| LangSearch | Web search for grounding AI responses | Search query text | (see LangSearch docs) |
| Sentry | Error monitoring, performance tracing, logs, and Session Replay | Error context, URLs, device info, account identifiers, session replay data. Sentry processes this only on our behalf under a Data Processing Addendum and does not sell or share this data. | sentry.io/privacy/ |
| Cloudflare Web Analytics | Cookie-free aggregate site analytics | Aggregate, non-identified performance metrics. No cookies or advertising identifiers used. | cloudflare.com/privacypolicy/ |
| Google Analytics 4 | Aggregate usage analytics — **only loaded after you explicitly accept analytics cookies** | Page views, device/browser info, approximate region, interaction events. Only active with your consent. | policies.google.com/privacy |
| IndexNow | Notifies search engines when public pages change | Public page URLs only | indexnow.org/documentation |
| MinIO (self-hosted) | Document storage | PDF documents uploaded by admins | Self-hosted, no third party |

### A note on Google Analytics and data sharing

Google Analytics 4 collects usage data and shares it with Google. Under broad interpretations of laws like the California Consumer Privacy Act (CCPA), sharing a visitor identifier with a third-party analytics provider could be considered "sharing" of personal data. We mitigate this risk by:

- **Requiring explicit opt-in consent** before Google Analytics loads. GA is blocked by default and only activates if you click "Accept" on the cookie banner.
- **Not linking Google Analytics to Google Ads** or any advertising product. We do not use GA data for behavioral advertising.
- **Not selling or sharing your data** with Google or anyone else for advertising purposes.

If you do not consent to analytics cookies, Google Analytics never loads and no data is sent to Google from your session.

---

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

---

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
- **Analytics data:** retained according to Google Analytics property retention settings configured by the operator, and only applies if you have consented to analytics cookies.

---

## 7. Cookies

**Necessary cookies (always active):**

- `tos_accepted` — records that a guest browser session has accepted the Terms of Service (session cookie)
- `guest_message_count` — tracks number of guest messages sent in a session
- `cookie_consent` — records your cookie consent choice
- `sidebar_state` — stores whether the sidebar is expanded or collapsed
- `sidebar_width` — stores your chosen sidebar width
- `authjs.session-token` or `__Secure-authjs.session-token` — Auth.js session JWT (authenticated users only)
- `authjs.csrf-token` — protects the sign-in flow from cross-site request forgery
- `authjs.callback-url` — remembers where to return you after sign-in (if set by Auth.js)

**Analytics cookies (only set after you explicitly accept):**

- `_ga`, `_ga_*` — Google Analytics cookies used to distinguish sessions and measure aggregate site usage. These are only set if you explicitly accept analytics cookies through the cookie banner.

We do not use advertising cookies. We do not use cookies for cross-site tracking.

Curator also stores local browser values for app preferences, including `curator:cookie-consent`, `curator:factCheck`, `curator:searchMode`, and the legacy `curator:deepSearch` value. These are stored in `localStorage`, not cookies, and are never shared with any third party.

You can change your analytics cookie choice at any time from the in-app cookie preferences control.

---

## 8. Your Privacy Rights

Depending on where you live, you may have rights under laws such as the California Consumer Privacy Act (CCPA/CPRA), the General Data Protection Regulation (GDPR), or other applicable privacy laws. Regardless of where you are located, we extend the following rights to all users:

- **Access:** request a copy of the data we hold about you
- **Deletion:** delete your account and all associated data at any time from Settings
- **Portability:** export your account data, including chats, project metadata, hidden project summaries, saved account settings, and support requests
- **Correction:** update your preferred name, team number, or other profile fields from Settings
- **Opt-out of analytics:** withdraw analytics consent at any time via the in-app cookie preferences control

**California residents (CCPA/CPRA):** You have the right to know what personal information we collect, to delete it, to correct it, and to opt out of the sale or sharing of your personal information. We do not sell or share your personal information. You also have the right to non-discrimination for exercising these rights.

To make a privacy request, use the Support section in Settings, the [Support page](/support), or open an issue on the project repository.

We may retain limited moderation records when reasonably necessary to enforce the Terms, investigate abuse, or document account suspensions.

---

## 9. Children's Privacy

The Service is intended for FRC team members, mentors, and coaches. FRC participants may include students under 18. We do not knowingly collect data from children under 13. If you believe a child under 13 has provided us personal information, contact us and we will delete it promptly.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify authenticated users of material changes via the app.

---

## 11. Contact

For privacy questions, data deletion requests, or to exercise any of your rights under this policy, use the Support section in Settings, the [Support page](/support), or open an issue on the project repository.