import { HttpError } from "wasp/server";

export function requireActiveUser<
  User extends { id: string; isDisabled?: boolean },
>(user: User | null | undefined): User {
  if (!user) {
    throw new HttpError(401, "Authentication is required");
  }
  if (user.isDisabled) {
    throw new HttpError(403, "This account is disabled");
  }
  return user;
}
