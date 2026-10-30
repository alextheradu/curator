import { isAdminEmail } from "@/lib/admin-emails";

export type AdminUserMutationAction = "promote" | "demote" | "ban" | "unban" | "delete";

type TargetUser = {
  id: string;
  email: string;
  isAdmin: boolean | null;
};

type AdminUserMutationInput = {
  action: AdminUserMutationAction;
  actorUserId: string;
  actorIsSuperAdmin: boolean;
  targetUser: TargetUser;
};

type AdminUserMutationResult =
  | { ok: true }
  | { ok: false; status: 400 | 403; error: string };

export function validateAdminUserMutation({
  action,
  actorUserId,
  actorIsSuperAdmin,
  targetUser,
}: AdminUserMutationInput): AdminUserMutationResult {
  if (isAdminEmail(targetUser.email)) {
    return { ok: false, status: 403, error: "Cannot modify a superadmin" };
  }

  if (targetUser.id === actorUserId && ["ban", "demote", "delete"].includes(action)) {
    return { ok: false, status: 400, error: "Admins cannot modify their own admin access" };
  }

  if (action === "promote" && !actorIsSuperAdmin) {
    return { ok: false, status: 403, error: "Only superadmins can promote admins" };
  }

  // Every action against an admin target is superadmin-only, including
  // "unban": otherwise a regular admin could reverse a superadmin's sanction
  // of another admin and hand their privileges straight back.
  if (targetUser.isAdmin && action !== "promote" && !actorIsSuperAdmin) {
    return { ok: false, status: 403, error: "Only superadmins can modify admins" };
  }

  return { ok: true };
}
