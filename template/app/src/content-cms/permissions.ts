export type CmsUserAccess = {
  role: "ADMIN" | "EDITOR" | "CREATOR";
  isAdmin: boolean;
  isDisabled: boolean;
};

export function canManageCms(user: CmsUserAccess): boolean {
  if (user.isDisabled) return false;
  return user.isAdmin || user.role === "ADMIN" || user.role === "EDITOR";
}
