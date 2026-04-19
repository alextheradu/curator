# Privacy Policy

**Curator — FRC AI Assistant**
**Last updated: April 18, 2026**

## 1. Overview

This Privacy Policy explains how Curator ("the Service", "we", "us") collects, uses, and protects information about you when you use our AI-powered FRC assistant. We are committed to being transparent and collecting only what is necessary to operate the Service.

## 2. Information We Collect

### 2a. Guests (unauthenticated users)
- A session cookie tracking whether you have accepted the Terms of Service
- A cookie counting the number of messages sent in the current session (used to enforce the guest message limit)
- Your chat messages (held in browser `localStorage` only — never sent to our servers beyond the API call to generate a response)

### 2b. Authenticated users (Google sign-in)
- **From Google OAuth:** your name, email address, and profile picture URL
- **Conversation history:** all messages you send and receive, stored in our database so they persist across devices
- **Sharing preferences:** whether a conversation has been marked public by you
- **Account metadata:** account creation date, last active date

### 2c. All users
- **Chat messages:** message content is sent to OpenRouter (our LLM provider) for processing. See OpenRouter's privacy policy at openrouter.ai/privacy.
- **Public shared chats:** if an authenticated user chooses to make a chat public, that conversation becomes accessible to anyone with the chat URL until the owner turns sharing off or deletes the chat.
- **Search queries:** if web search is triggered, your query is sent to LangSearch. See LangSearch's privacy policy for details.
- **Server logs:** standard web server request logs (IP address, timestamp, user agent) retained for up to 30 days.

## 3. How We Use Your Information

- To provide and improve the Service
- To authenticate you and persist your conversation history
- To honor your choice to publish or unpublish shared chat links
- To enforce the guest message limit and Terms of Service acceptance
- To generate AI responses grounded in FRC documentation

We do **not** sell your data, use it for advertising, or share it with third parties except as described in Section 4.

## 4. Third-Party Services

| Service | Purpose | Their Privacy Policy |
|---------|---------|---------------------|
| Google OAuth | Authentication | policies.google.com/privacy |
| OpenRouter | LLM inference | openrouter.ai/privacy |
| LangSearch | Web search | (see LangSearch docs) |
| MinIO (self-hosted) | Document storage | Self-hosted, no third party |

## 5. Data Storage

- User data and conversation history are stored in a self-hosted PostgreSQL database.
- Public/private sharing status for authenticated conversations is stored alongside the conversation record in PostgreSQL.
- PDF documents, including season-specific references and general team reference files, are stored in a self-hosted MinIO instance.
- Vector embeddings are stored in a self-hosted Qdrant instance.
- No user data is stored on third-party cloud storage.

## 6. Data Retention

- **Guest data:** stored only in your browser's `localStorage`. Cleared when you clear your browser data.
- **Authenticated user data:** retained for as long as your account exists. You may delete your account and all associated data at any time from the Settings page.
- **Public shared chats:** remain publicly accessible until you make the chat private again or delete it.
- **Server logs:** retained for 30 days, then deleted.

## 7. Cookies

We use the following cookies:
- `tos_accepted` — records that you have accepted the Terms of Service (session cookie)
- `guest_message_count` — tracks number of guest messages sent
- `authjs.session-token` — Auth.js session JWT (authenticated users only)

We do not use tracking, advertising, or analytics cookies.

## 8. Children's Privacy

The Service is intended for FRC team members, mentors, and coaches. We do not knowingly collect data from children under 13. If you believe a child has provided us personal information, contact us and we will delete it.

## 9. Your Rights

You have the right to:
- Access the data we hold about you
- Delete your account and all associated data
- Make a shared chat private again or delete it to remove public access
- Export your conversation history

These actions are available from the Settings page once logged in.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify authenticated users of material changes via the app.

## 11. Contact

For privacy questions or data deletion requests, open an issue on the project repository or contact the operator directly.
