# Curator Projects Design

## Research Summary

ChatGPT Projects and Claude Projects are personal workspaces that organize related chats and provide scoped context for future chats. ChatGPT supports project icons and colors, moving existing chats into a project from the chat menu, and project memory that can draw from chats inside the same project. Claude supports self-contained project workspaces with their own chat histories and knowledge/instruction context, including moving chats into and out of projects from chat menus.

Curator will adopt the core signed-in personal workspace behavior while avoiding organization sharing, file uploads, and visible project context editors.

## Product Scope

Projects are signed-in-only containers for organizing chats and giving the assistant private project-scoped memory. Guest users do not see project controls.

A project includes:

- Name.
- Icon key from a fixed Curator icon library.
- Color key from a fixed Curator palette.
- Hidden AI-maintained context summary.
- Owner and timestamps.

Out of scope for this version:

- Organization or shared projects.
- File uploads or project source management.
- User-visible project instructions or context editing.
- Public project pages.
- Bulk chat movement.

## User Experience

The sidebar gains a signed-in-only Projects section above History.

Users can create a project from a `New project` control. The creation/edit modal uses the current chatroom visual language: compact dark surfaces, rounded sidebar controls, lucide icons, restrained borders, and the existing dropdown/dialog patterns.

Project rows show the selected icon, color treatment, project name, chat count, and a 3-dot menu for edit/delete. Projects can expand to reveal their chats. Chats inside a project are organized under that project and do not also appear in normal History.

Normal History remains date-grouped and only contains chats without a project.

Conversation row menus add:

- `Move to project` for unprojected chats.
- `Move to project` for changing a project chat to another project.
- `Remove from project` for returning a project chat to normal History.

Deleting a project detaches its chats back into History instead of deleting chat history. The confirmation copy makes that behavior explicit.

## Icon And Color Library

The first version uses a fixed library of lucide icons instead of arbitrary uploads or custom SVG. The initial set should cover FRC/workflow use cases:

- `Folder`
- `Bot`
- `BookOpen`
- `Wrench`
- `Trophy`
- `Users`
- `Rocket`
- `Target`
- `ClipboardList`
- `Sparkles`

Colors are selected from a fixed palette designed to work in Curator's dark sidebar. The stored value is a stable key, not raw CSS, so future palette tuning does not require data migration.

## Data Model

Add a `projects` table:

- `id` UUID primary key.
- `user_id` text foreign key to users, cascade delete.
- `name` text.
- `icon` text.
- `color` text.
- `context_summary` text, not user visible.
- `created_at` timestamp.
- `updated_at` timestamp.

Add `project_id` to `conversations`, nullable, foreign key to projects with `ON DELETE SET NULL`.

Project rows are private to their owning user. Row-level security must mirror the owner-only behavior used by conversations.

Conversation project assignment must be owner-only and must reject assigning a chat to a project owned by a different user.

## API Design

Add project APIs:

- `GET /api/projects`: list the signed-in user's projects.
- `POST /api/projects`: create a signed-in user's project.
- `PATCH /api/projects/[id]`: update name, icon, or color.
- `DELETE /api/projects/[id]`: delete the project and detach conversations.

Extend `PATCH /api/conversations/[id]`:

- Accept `projectId` as a string UUID or `null`.
- Verify the conversation belongs to the signed-in user.
- If `projectId` is not null, verify the project belongs to the same signed-in user.
- Update `updatedAt` consistently with other conversation mutations.

The client API layer gets project fetch/create/update/delete helpers and extends the conversation update payload type.

## Client State

Extend the Zustand chat store with:

- `projects`.
- `replaceProjects`.
- `upsertProject`.
- `deleteProject`.
- `moveConversationToProject`.

Extend `Conversation` with nullable `projectId`.

Authenticated bootstrap loads projects alongside conversations, then normalizes both into store state. Guest state does not persist projects.

Conversation sorting remains update-time based. The sidebar derives:

- Project chats by `projectId`.
- History chats where `projectId` is null.

## AI Project Context

When a chat belongs to a project, the chat request includes the active conversation id and project id. The server verifies:

- The user is authenticated.
- The conversation belongs to the user.
- The conversation belongs to the requested project.
- The project belongs to the user.

If valid, the server loads the project's hidden `context_summary` and injects it into the system prompt as private project memory. That summary is used only for chats inside the same project.

After a completed assistant response in a project chat, the server updates the project's hidden summary using the latest exchange and the previous summary. The summary should be bounded in length and written as compact factual context for future project chats. It must not include unrelated chats or global user profile memory.

The project context summary is not exposed in settings, exports as a separate editor, or any project UI. Account export should include the stored project metadata and hidden summary because it is user data.

## Legal Documents

This feature changes stored account data. Update the live legal documents and bump their last updated dates:

- `public/privacy-policy.md`: disclose project metadata, chat-to-project organization, and hidden project context summaries derived from project chats. Confirm retention follows account/chat retention behavior.
- `public/terms-of-service.md`: mention project organization and AI-generated project context as part of the service behavior if the current terms warrant it.

No new third-party service is introduced by this feature.

## Error Handling

Project actions use existing toast patterns:

- Sign-in required for project actions.
- Unable to create/update/delete project.
- Unable to move chat.
- Project not found or unauthorized.

Optimistic UI updates should roll back on failed network mutations.

## Testing

Use test-first implementation for core behaviors:

- Project record normalization.
- Conversation `projectId` normalization and update payload typing.
- Sidebar derivation: project chats are nested under projects and excluded from History.
- Move-to-project and remove-from-project store behavior.
- Server authorization for assigning conversations to projects.
- Server authorization for project context injection.
- Hidden context summary update is only attempted for project chats.

Run lint and build after implementation. If browser verification is needed for sidebar layout, run the local dev server and inspect desktop/mobile states.
