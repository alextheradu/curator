import type { Project } from "@/lib/projects";
import type { Conversation } from "@/lib/store";

function byUpdatedDesc(a: Conversation, b: Conversation) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function deriveProjectSidebar(projects: Project[], conversations: Conversation[]) {
  return {
    projects: projects.map((project) => ({
      project,
      conversations: conversations
        .filter((conversation) => conversation.projectId === project.id)
        .sort(byUpdatedDesc),
    })),
    history: conversations
      .filter((conversation) => conversation.projectId == null)
      .sort(byUpdatedDesc),
  };
}
