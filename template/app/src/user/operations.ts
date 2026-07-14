import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import { type GetPaginatedUsers } from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  getEffectiveUserRole,
  getSelfAccessChangeViolation,
  removesActiveAdministrator,
  USER_ROLES,
  type ManagedUserAccess,
  type UserRoleValue,
} from "./accessPolicy";

const PAGE_SIZE = 15;

type AuthContext = { user?: { id: string } | null };

export type UserAccessRecord = ManagedUserAccess;

type GetPaginatedUsersOutput = {
  users: UserAccessRecord[];
  total: number;
  totalPages: number;
};

const userFilterSchema = z.object({
  emailContains: z.string().trim().min(1).max(320).optional(),
  role: z.enum(USER_ROLES).optional(),
  isDisabled: z.boolean().optional(),
});

const getPaginatorArgsSchema = z.object({
  skipPages: z.number().int().min(0),
  filter: userFilterSchema.default({}),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

const updateUserAccessInputSchema = z.object({
  id: z.string().trim().min(1),
  role: z.enum(USER_ROLES),
  isDisabled: z.boolean(),
});

type DatabaseUserAccess = {
  id: string;
  email: string | null;
  username: string | null;
  role: UserRoleValue;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const userAccessSelection = {
  id: true,
  email: true,
  username: true,
  role: true,
  isAdmin: true,
  isDisabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

function toUserAccessRecord(user: DatabaseUserAccess): UserAccessRecord {
  return {
    ...user,
    role: getEffectiveUserRole(user),
    isAdmin: getEffectiveUserRole(user) === "ADMIN",
  };
}

async function requireActiveAdministrator(userId: string | undefined) {
  if (!userId) {
    throw new HttpError(401, "Authentication is required.");
  }
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: userAccessSelection,
  });
  if (
    !actor ||
    actor.isDisabled ||
    (actor.role !== "ADMIN" && !actor.isAdmin)
  ) {
    throw new HttpError(403, "Active administrator access is required.");
  }
  return actor as DatabaseUserAccess;
}

export const getPaginatedUsers: GetPaginatedUsers<
  GetPaginatedUsersInput,
  GetPaginatedUsersOutput
> = async (rawArgs, context) => {
  await requireActiveAdministrator(context.user?.id);
  const { skipPages, filter } = ensureArgsSchemaOrThrowHttpError(
    getPaginatorArgsSchema,
    rawArgs,
  );

  const roleWhere: Prisma.UserWhereInput | undefined = filter.role
    ? filter.role === "ADMIN"
      ? { OR: [{ role: "ADMIN" }, { isAdmin: true }] }
      : { role: filter.role, isAdmin: false }
    : undefined;
  const where: Prisma.UserWhereInput = {
    AND: [
      ...(filter.emailContains
        ? [
            {
              OR: [
                {
                  email: {
                    contains: filter.emailContains,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  username: {
                    contains: filter.emailContains,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            } satisfies Prisma.UserWhereInput,
          ]
        : []),
      ...(roleWhere ? [roleWhere] : []),
      ...(filter.isDisabled === undefined
        ? []
        : [{ isDisabled: filter.isDisabled }]),
    ],
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userAccessSelection,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: skipPages * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: (users as DatabaseUserAccess[]).map(toUserAccessRecord),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
};

export async function updateUserAccessById(
  rawArgs: unknown,
  context: AuthContext,
): Promise<UserAccessRecord> {
  const input = ensureArgsSchemaOrThrowHttpError(
    updateUserAccessInputSchema,
    rawArgs,
  );
  await requireActiveAdministrator(context.user?.id);

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const actor = await tx.user.findUnique({
          where: { id: context.user!.id },
          select: userAccessSelection,
        });
        if (
          !actor ||
          actor.isDisabled ||
          (actor.role !== "ADMIN" && !actor.isAdmin)
        ) {
          throw new HttpError(403, "Active administrator access is required.");
        }

        const target = await tx.user.findUnique({
          where: { id: input.id },
          select: userAccessSelection,
        });
        if (!target) throw new HttpError(404, "User not found.");

        const selfViolation = getSelfAccessChangeViolation(
          actor.id,
          target.id,
          input,
        );
        if (selfViolation === "SELF_DISABLE") {
          throw new HttpError(409, "You cannot disable your own account.");
        }
        if (selfViolation === "SELF_DEMOTION") {
          throw new HttpError(409, "You cannot demote your own account.");
        }

        if (removesActiveAdministrator(target, input)) {
          const activeAdministratorCount = await tx.user.count({
            where: {
              isDisabled: false,
              OR: [{ role: "ADMIN" }, { isAdmin: true }],
            },
          });
          if (activeAdministratorCount <= 1) {
            throw new HttpError(
              409,
              "Assign another active administrator before changing this account.",
            );
          }
        }

        return tx.user.update({
          where: { id: input.id },
          data: {
            role: input.role,
            isAdmin: input.role === "ADMIN",
            isDisabled: input.isDisabled,
          },
          select: userAccessSelection,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return toUserAccessRecord(updated as DatabaseUserAccess);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new HttpError(
        409,
        "User access changed concurrently. Refresh and try again.",
      );
    }
    throw error;
  }
}
