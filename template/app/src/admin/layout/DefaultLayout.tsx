import { type ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import { WorkspaceLayout } from "../../client/components/workspace/WorkspaceLayout";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

export function DefaultLayout({ children, user }: Props) {
  return (
    <WorkspaceLayout user={user} adminOnly>
      {children}
    </WorkspaceLayout>
  );
}
