import { type File } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type AddFileToDb,
  type CreateFileUploadUrl,
  type DeleteFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
} from "wasp/server/operations";

import * as z from "zod";
import { requireActiveUser } from "../server/activeUserGuard";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  checkFileExistsInS3,
  deleteFileFromS3,
  getDownloadFileSignedURLFromS3,
  getUploadFileSignedURLFromS3,
} from "./s3Utils";
import { ALLOWED_FILE_TYPES, isOwnedS3Key } from "./validation";

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().trim().min(1).max(255),
});

type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const createFileUploadUrl: CreateFileUploadUrl<
  CreateFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
    s3Key: string;
  }
> = async (rawArgs, context) => {
  const user = requireActiveUser(context.user);

  const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(
    createFileInputSchema,
    rawArgs,
  );

  return await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: user.id,
  });
};

const addFileToDbInputSchema = z.object({
  s3Key: z.string().trim().min(1).max(512),
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().trim().min(1).max(255),
});

type AddFileToDbInput = z.infer<typeof addFileToDbInputSchema>;

export const addFileToDb: AddFileToDb<AddFileToDbInput, File> = async (
  rawArgs,
  context,
) => {
  const user = requireActiveUser(context.user);

  const args = ensureArgsSchemaOrThrowHttpError(
    addFileToDbInputSchema,
    rawArgs,
  );

  if (!isOwnedS3Key(args.s3Key, user.id)) {
    throw new HttpError(
      403,
      "The uploaded object does not belong to this user.",
    );
  }

  const duplicate = await context.entities.File.findFirst({
    where: { s3Key: args.s3Key },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpError(409, "This uploaded object is already registered.");
  }

  const fileExists = await checkFileExistsInS3({ s3Key: args.s3Key });
  if (!fileExists) {
    throw new HttpError(404, "File not found in S3.");
  }

  return context.entities.File.create({
    data: {
      name: args.fileName,
      s3Key: args.s3Key,
      type: args.fileType,
      user: { connect: { id: user.id } },
    },
  });
};

export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (
  _args,
  context,
) => {
  const user = requireActiveUser(context.user);
  return context.entities.File.findMany({
    where: {
      user: {
        id: user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getDownloadFileSignedURLInputSchema = z.object({
  s3Key: z.string().trim().min(1).max(512),
});

type GetDownloadFileSignedURLInput = z.infer<
  typeof getDownloadFileSignedURLInputSchema
>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, context) => {
  const user = requireActiveUser(context.user);
  const { s3Key } = ensureArgsSchemaOrThrowHttpError(
    getDownloadFileSignedURLInputSchema,
    rawArgs,
  );
  const file = await context.entities.File.findFirst({
    where: { s3Key, userId: user.id },
    select: { s3Key: true },
  });
  if (!file) {
    throw new HttpError(404, "File not found.");
  }
  return await getDownloadFileSignedURLFromS3({ s3Key: file.s3Key });
};

const deleteFileInputSchema = z.object({
  id: z.string(),
});

type DeleteFileInput = z.infer<typeof deleteFileInputSchema>;

export const deleteFile: DeleteFile<DeleteFileInput, File> = async (
  rawArgs,
  context,
) => {
  const user = requireActiveUser(context.user);

  const args = ensureArgsSchemaOrThrowHttpError(deleteFileInputSchema, rawArgs);

  const deletedFile = await context.entities.File.delete({
    where: {
      id: args.id,
      user: {
        id: user.id,
      },
    },
  });

  try {
    await deleteFileFromS3({ s3Key: deletedFile.s3Key });
  } catch (error) {
    console.error(
      `S3 deletion failed. Orphaned file s3Key: ${deletedFile.s3Key}`,
      error,
    );
  }

  return deletedFile;
};
