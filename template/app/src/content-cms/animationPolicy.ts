import { canManageCms, type CmsUserAccess } from "./permissions";
import { getCmsPublicMediaDescriptor } from "./publicMedia";

type CmsAnimationCandidate =
  | (NonNullable<Parameters<typeof getCmsPublicMediaDescriptor>[0]> & {
      user: { isDisabled: boolean };
    })
  | null;

export function canAttachCmsAnimation(
  actor: CmsUserAccess,
  animation: CmsAnimationCandidate,
): boolean {
  return Boolean(
    canManageCms(actor) &&
      animation &&
      !animation.user.isDisabled &&
      getCmsPublicMediaDescriptor(animation),
  );
}

export function getCmsAnimationOwnerLabel(user: {
  username: string | null;
  email: string | null;
}): string | null {
  return user.username?.trim() || user.email?.trim() || null;
}

export function shouldValidateCmsAnimationChange(
  currentAnimationId: string | null,
  nextAnimationId: string | null,
): boolean {
  return nextAnimationId !== null && nextAnimationId !== currentAnimationId;
}
