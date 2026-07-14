import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "wasp/client/auth";
import {
  getPaginatedUsers,
  updateUserAccessById,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Switch } from "../../../client/components/ui/switch";
import { toast } from "../../../client/hooks/use-toast";
import { useDebounce } from "../../../client/hooks/useDebounce";
import {
  USER_ROLES,
  type ManagedUserAccess,
  type UserRoleValue,
} from "../../../user/accessPolicy";
import { LoadingSpinner } from "../../layout/LoadingSpinner";
import { useUserAdminCopy } from "./i18n";

export function UsersTable() {
  const { roleLabel, t } = useUserAdminCopy();
  const { data: currentUser, isLoading: isAuthLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRoleValue | undefined>();
  const [isDisabled, setIsDisabled] = useState<boolean | undefined>();
  const [editingUser, setEditingUser] = useState<ManagedUserAccess | null>(
    null,
  );
  const debouncedSearch = useDebounce(search, 300);
  const usersQuery = useQuery(getPaginatedUsers, {
    skipPages: currentPage - 1,
    filter: {
      ...(debouncedSearch && { emailContains: debouncedSearch }),
      ...(role && { role }),
      ...(isDisabled !== undefined && { isDisabled }),
    },
  });
  const data = usersQuery.data;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [debouncedSearch, role, isDisabled]);

  useEffect(() => {
    if (data && currentPage > data.totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(data.totalPages);
    }
  }, [currentPage, data]);

  return (
    <section className="space-y-4" aria-labelledby="users-heading">
      <div className="flex flex-col gap-1">
        <h2 id="users-heading" className="text-lg font-semibold">
          {t("heading")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="border-border bg-muted/25 grid gap-3 border p-4 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="user-search">{t("search")}</Label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-2.5 size-4" />
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-filter">{t("role")}</Label>
          <Select
            value={role ?? "ALL"}
            onValueChange={(value) =>
              setRole(value === "ALL" ? undefined : (value as UserRoleValue))
            }
          >
            <SelectTrigger id="role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allRoles")}</SelectItem>
              {USER_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {roleLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-filter">{t("access")}</Label>
          <Select
            value={
              isDisabled === undefined
                ? "ALL"
                : isDisabled
                  ? "DISABLED"
                  : "ACTIVE"
            }
            onValueChange={(value) =>
              setIsDisabled(value === "ALL" ? undefined : value === "DISABLED")
            }
          >
            <SelectTrigger id="access-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allAccessStates")}</SelectItem>
              <SelectItem value="ACTIVE">{t("active")}</SelectItem>
              <SelectItem value="DISABLED">{t("disabled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground pb-2 text-sm" aria-live="polite">
          {data ? t("userCount", { count: data.total }) : t("loadingUsers")}
        </p>
      </div>

      <div className="border-border overflow-hidden border">
        {usersQuery.isLoading && (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        )}
        {usersQuery.error && (
          <div className="p-6 text-sm">
            <p className="text-destructive font-medium">{t("loadError")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => usersQuery.refetch()}
            >
              {t("tryAgain")}
            </Button>
          </div>
        )}
        {data && data.users.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">{t("tableCaption")}</caption>
                <thead className="bg-muted/40 border-border border-b">
                  <tr>
                    <th scope="col" className="w-[30%] px-4 py-3 font-medium">
                      {t("user")}
                    </th>
                    <th scope="col" className="w-[14%] px-4 py-3 font-medium">
                      {t("role")}
                    </th>
                    <th scope="col" className="w-[13%] px-4 py-3 font-medium">
                      {t("access")}
                    </th>
                    <th scope="col" className="w-[16%] px-4 py-3 font-medium">
                      {t("created")}
                    </th>
                    <th scope="col" className="w-[16%] px-4 py-3 font-medium">
                      {t("updated")}
                    </th>
                    <th
                      scope="col"
                      className="w-[11%] px-4 py-3 text-right font-medium"
                    >
                      {t("action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {data.users.map((user) => (
                    <UserTableRow
                      key={`${user.id}-${new Date(user.updatedAt).valueOf()}`}
                      user={user}
                      editDisabled={
                        isAuthLoading ||
                        !currentUser ||
                        currentUser.id === user.id
                      }
                      isCurrentUser={currentUser?.id === user.id}
                      onEdit={() => setEditingUser(user)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-border divide-y md:hidden">
              {data.users.map((user) => (
                <UserMobileRow
                  key={`${user.id}-${new Date(user.updatedAt).valueOf()}`}
                  user={user}
                  editDisabled={
                    isAuthLoading || !currentUser || currentUser.id === user.id
                  }
                  isCurrentUser={currentUser?.id === user.id}
                  onEdit={() => setEditingUser(user)}
                />
              ))}
            </ul>
          </>
        )}
        {data && data.users.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center gap-2 p-10 text-center">
            <UserRoundCog className="size-7" />
            <p className="text-sm">{t("noUsers")}</p>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <nav
          className="flex items-center justify-between"
          aria-label={t("userPages")}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft /> {t("previous")}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t("pageOf", { page: currentPage, totalPages: data.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === data.totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            {t("next")} <ChevronRight />
          </Button>
        </nav>
      )}

      {editingUser && (
        <AccessEditor
          key={editingUser.id}
          user={editingUser}
          onChanged={usersQuery.refetch}
          onClose={() => setEditingUser(null)}
        />
      )}
    </section>
  );
}

function UserTableRow({
  user,
  editDisabled,
  isCurrentUser,
  onEdit,
}: {
  user: ManagedUserAccess;
  editDisabled: boolean;
  isCurrentUser: boolean;
  onEdit: () => void;
}) {
  const { formatDate } = useUserAdminCopy();
  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-4 align-top">
        <UserIdentity user={user} />
      </td>
      <td className="px-4 py-4 align-top">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-4 align-top">
        <AccessBadge isDisabled={user.isDisabled} />
      </td>
      <td className="text-muted-foreground px-4 py-4 align-top">
        {formatDate(user.createdAt)}
      </td>
      <td className="text-muted-foreground px-4 py-4 align-top">
        {formatDate(user.updatedAt)}
      </td>
      <td className="px-4 py-4 text-right align-top">
        <AccessEditorButton
          isCurrentUser={isCurrentUser}
          disabled={editDisabled}
          onClick={onEdit}
        />
      </td>
    </tr>
  );
}

function UserMobileRow({
  user,
  editDisabled,
  isCurrentUser,
  onEdit,
}: {
  user: ManagedUserAccess;
  editDisabled: boolean;
  isCurrentUser: boolean;
  onEdit: () => void;
}) {
  const { formatDate, t } = useUserAdminCopy();
  return (
    <li className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <AccessEditorButton
          isCurrentUser={isCurrentUser}
          disabled={editDisabled}
          onClick={onEdit}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("role")}</dt>
          <dd className="mt-1">
            <RoleBadge role={user.role} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("access")}</dt>
          <dd className="mt-1">
            <AccessBadge isDisabled={user.isDisabled} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("created")}</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("updated")}</dt>
          <dd>{formatDate(user.updatedAt)}</dd>
        </div>
      </dl>
    </li>
  );
}

function UserIdentity({ user }: { user: ManagedUserAccess }) {
  const { t } = useUserAdminCopy();
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{user.email || t("noEmail")}</p>
      <p className="text-muted-foreground truncate text-xs">
        {user.username || user.id}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRoleValue }) {
  const { roleLabel } = useUserAdminCopy();
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium">
      {role === "ADMIN" && <ShieldCheck className="size-3" />}
      {roleLabel(role)}
    </span>
  );
}

function AccessBadge({ isDisabled }: { isDisabled: boolean }) {
  const { t } = useUserAdminCopy();
  return (
    <span
      className={`inline-flex rounded-sm px-2 py-1 text-xs font-medium ${
        isDisabled
          ? "bg-destructive/10 text-destructive"
          : "bg-success/15 text-success"
      }`}
    >
      {isDisabled ? t("disabled") : t("active")}
    </span>
  );
}

function AccessEditor({
  user,
  onChanged,
  onClose,
}: {
  user: ManagedUserAccess;
  onChanged: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [role, setRole] = useState<UserRoleValue>(user.role);
  const [isDisabled, setIsDisabled] = useState(user.isDisabled);
  const [isSaving, setIsSaving] = useState(false);
  const { roleLabel, t } = useUserAdminCopy();
  const hasChanges = role !== user.role || isDisabled !== user.isDisabled;

  const save = async () => {
    setIsSaving(true);
    try {
      await updateUserAccessById({ id: user.id, role, isDisabled });
      await onChanged();
      onClose();
      toast({
        title: t("accessUpdated"),
        description: t("accessUpdatedDescription", {
          account: user.email || user.username || t("accountFallback"),
          role: roleLabel(role),
          status: isDisabled ? t("disabled") : t("active"),
        }),
      });
    } catch (error) {
      toast({
        title: t("updateFailed"),
        description: getErrorMessage(error, t("retryError")),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription", {
              account: user.email || user.username || user.id,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor={`role-${user.id}`}>{t("role")}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRoleValue)}
            >
              <SelectTrigger id={`role-${user.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {roleLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("roleHelp")}</p>
          </div>
          <div className="border-border flex items-center justify-between gap-4 border px-3 py-3">
            <div>
              <Label htmlFor={`disabled-${user.id}`}>
                {t("accountAccess")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t("disabledHelp")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {isDisabled ? t("disabled") : t("active")}
              </span>
              <Switch
                id={`disabled-${user.id}`}
                checked={!isDisabled}
                onCheckedChange={(active) => setIsDisabled(!active)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            {t("confirmChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessEditorButton({
  disabled,
  isCurrentUser,
  onClick,
}: {
  disabled: boolean;
  isCurrentUser: boolean;
  onClick: () => void;
}) {
  const { t } = useUserAdminCopy();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      title={isCurrentUser ? t("selfEditBlocked") : t("editRoleAccess")}
      onClick={onClick}
    >
      <UserRoundCog /> {t("edit")}
    </Button>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
