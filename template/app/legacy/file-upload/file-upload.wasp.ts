import { action, query, type Spec } from "@wasp.sh/spec";
import {
  addFileToDb,
  createFileUploadUrl,
  deleteFile,
  getAllFilesByUser,
  getDownloadFileSignedURL,
} from "./operations" with { type: "ref" };

export const fileUploadSpec: Spec = [
  query(getAllFilesByUser, { entities: ["User", "File"] }),
  query(getDownloadFileSignedURL, { entities: ["User", "File"] }),
  action(addFileToDb, { entities: ["User", "File"] }),
  action(createFileUploadUrl, { entities: ["User", "File"] }),
  action(deleteFile, { entities: ["User", "File"] }),
];
