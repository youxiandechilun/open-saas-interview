import { useI18n } from "../../../i18n/I18nProvider";
import type { Locale } from "../../../i18n/messages";
import type { UserRoleValue } from "../../../user/accessPolicy";

const english = {
  pageTitle: "Users",
  heading: "Users and roles",
  description:
    "Assign workspace permissions and suspend access without deleting audit history.",
  search: "Search",
  searchPlaceholder: "Email or username",
  role: "Role",
  access: "Access",
  allRoles: "All roles",
  allAccessStates: "All access states",
  active: "Active",
  disabled: "Disabled",
  userCount: "{count} users",
  loadingUsers: "Loading users",
  loadError: "Could not load users.",
  tryAgain: "Try again",
  tableCaption: "Workspace users, roles, access status and account dates",
  user: "User",
  created: "Created",
  updated: "Updated",
  action: "Action",
  noUsers: "No users match the current filters.",
  userPages: "User pages",
  previous: "Previous",
  next: "Next",
  pageOf: "Page {page} of {totalPages}",
  noEmail: "No email",
  edit: "Edit",
  selfEditBlocked: "Your own administrator access cannot be changed here",
  editRoleAccess: "Edit role and access",
  accessUpdated: "User access updated",
  accessUpdatedDescription: "{account} is now {role} with {status} access.",
  accountFallback: "The account",
  updateFailed: "Could not update user access",
  dialogTitle: "Edit user access",
  dialogDescription: "Changes take effect immediately for {account}.",
  roleHelp:
    "Editors manage articles. Creators can use generation tools but cannot publish or manage users.",
  accountAccess: "Account access",
  disabledHelp: "Disabled users keep their content and audit history.",
  cancel: "Cancel",
  confirmChanges: "Confirm changes",
  retryError: "Refresh the user list and try again.",
} as const;

export type UserAdminCopyKey = keyof typeof english;
type Variables = Record<string, string | number>;

const chinese: Record<UserAdminCopyKey, string> = {
  pageTitle: "用户",
  heading: "用户与角色",
  description: "分配工作区权限或停用账号，同时保留内容和审计记录。",
  search: "搜索",
  searchPlaceholder: "邮箱或用户名",
  role: "角色",
  access: "访问状态",
  allRoles: "全部角色",
  allAccessStates: "全部访问状态",
  active: "正常",
  disabled: "已停用",
  userCount: "共 {count} 名用户",
  loadingUsers: "正在加载用户",
  loadError: "无法加载用户。",
  tryAgain: "重试",
  tableCaption: "工作区用户、角色、访问状态和账号日期",
  user: "用户",
  created: "创建时间",
  updated: "更新时间",
  action: "操作",
  noUsers: "没有符合当前筛选条件的用户。",
  userPages: "用户分页",
  previous: "上一页",
  next: "下一页",
  pageOf: "第 {page} 页，共 {totalPages} 页",
  noEmail: "未设置邮箱",
  edit: "编辑",
  selfEditBlocked: "不能在这里修改自己的管理员权限",
  editRoleAccess: "编辑角色和访问状态",
  accessUpdated: "用户权限已更新",
  accessUpdatedDescription: "{account} 当前角色为{role}，访问状态为{status}。",
  accountFallback: "该账号",
  updateFailed: "无法更新用户权限",
  dialogTitle: "编辑用户权限",
  dialogDescription: "对 {account} 的修改会立即生效。",
  roleHelp: "编辑可以管理文章；创作者可以使用生成工具，但不能发布或管理用户。",
  accountAccess: "账号访问",
  disabledHelp: "停用用户仍会保留其内容和审计记录。",
  cancel: "取消",
  confirmChanges: "确认修改",
  retryError: "请刷新用户列表后重试。",
};

const roleLabels: Record<Locale, Record<UserRoleValue, string>> = {
  en: {
    ADMIN: "Administrator",
    EDITOR: "Editor",
    CREATOR: "Creator",
  },
  "zh-CN": {
    ADMIN: "管理员",
    EDITOR: "编辑",
    CREATOR: "创作者",
  },
};

export function getUserAdminText(
  locale: Locale,
  key: UserAdminCopyKey,
  variables: Variables = {},
): string {
  const message = (locale === "zh-CN" ? chinese : english)[key];
  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : placeholder,
  );
}

export function getUserRoleLabel(locale: Locale, role: UserRoleValue): string {
  return roleLabels[locale][role];
}

export function useUserAdminCopy() {
  const { locale } = useI18n();
  return {
    t: (key: UserAdminCopyKey, variables?: Variables) =>
      getUserAdminText(locale, key, variables),
    roleLabel: (role: UserRoleValue) => getUserRoleLabel(locale, role),
    formatDate: (value: Date | string) =>
      new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(value)),
  };
}
