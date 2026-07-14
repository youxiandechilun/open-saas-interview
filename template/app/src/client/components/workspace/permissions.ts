import { type AuthUser } from "wasp/auth";

type WorkspaceUser = AuthUser & {
  role?: "ADMIN" | "EDITOR" | "CREATOR";
  isDisabled?: boolean;
};

export function hasAdminAccess(user: AuthUser): boolean {
  const workspaceUser = user as WorkspaceUser;
  return (
    workspaceUser.isDisabled !== true &&
    (workspaceUser.role === "ADMIN" || user.isAdmin)
  );
}

export function hasPublishingAccess(user: AuthUser): boolean {
  const workspaceUser = user as WorkspaceUser;
  return (
    workspaceUser.isDisabled !== true &&
    (hasAdminAccess(user) || workspaceUser.role === "EDITOR")
  );
}

export function getWorkspaceRole(user: AuthUser): string {
  const workspaceUser = user as WorkspaceUser;
  if (hasAdminAccess(user)) return "Administrator";
  if (workspaceUser.role === "EDITOR") return "Editor";
  return "Creator";
}
