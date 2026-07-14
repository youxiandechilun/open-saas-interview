export const USER_ROLES = ["ADMIN", "EDITOR", "CREATOR"] as const;

export type UserRoleValue = (typeof USER_ROLES)[number];

export type UserAccessState = {
  id: string;
  role: UserRoleValue;
  isAdmin: boolean;
  isDisabled: boolean;
};

export type ManagedUserAccess = UserAccessState & {
  email: string | null;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserAccessChange = {
  role: UserRoleValue;
  isDisabled: boolean;
};

export function getEffectiveUserRole(
  user: Pick<UserAccessState, "role" | "isAdmin">,
): UserRoleValue {
  return user.isAdmin ? "ADMIN" : user.role;
}

export function getInitialUserRole(isAdmin: boolean): UserRoleValue {
  return isAdmin ? "ADMIN" : "CREATOR";
}

export function isActiveAdministrator(
  user: Pick<UserAccessState, "role" | "isAdmin" | "isDisabled">,
): boolean {
  return !user.isDisabled && getEffectiveUserRole(user) === "ADMIN";
}

export function hasActiveAdminAccess(
  user:
    | Partial<Pick<UserAccessState, "role" | "isAdmin" | "isDisabled">>
    | undefined,
): boolean {
  return Boolean(
    user &&
    user.isDisabled !== true &&
    (user.role === "ADMIN" || user.isAdmin === true),
  );
}

export function hasActivePublishingAccess(
  user:
    | Partial<Pick<UserAccessState, "role" | "isAdmin" | "isDisabled">>
    | undefined,
): boolean {
  return (
    hasActiveAdminAccess(user) ||
    Boolean(user && user.isDisabled !== true && user.role === "EDITOR")
  );
}

export function getSelfAccessChangeViolation(
  actorId: string,
  targetId: string,
  next: UserAccessChange,
): "SELF_DEMOTION" | "SELF_DISABLE" | null {
  if (actorId !== targetId) return null;
  if (next.isDisabled) return "SELF_DISABLE";
  if (next.role !== "ADMIN") return "SELF_DEMOTION";
  return null;
}

export function removesActiveAdministrator(
  current: Pick<UserAccessState, "role" | "isAdmin" | "isDisabled">,
  next: UserAccessChange,
): boolean {
  return (
    isActiveAdministrator(current) && (next.isDisabled || next.role !== "ADMIN")
  );
}
