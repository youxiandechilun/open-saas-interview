import { FormEvent, useEffect, useState } from "react";
import {
  addFileToDb,
  createFileUploadUrl,
  deleteFile,
  getAllFilesByUser,
  getDownloadFileSignedURL,
  useQuery,
} from "wasp/client/operations";
import type { File } from "wasp/entities";

import { Download, Trash } from "lucide-react";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardTitle } from "../client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Progress } from "../client/components/ui/progress";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import { useI18n } from "../i18n";
import { uploadFileWithProgress, validateFile } from "./fileUploading";
import { ALLOWED_FILE_TYPES } from "./validation";

export function FileUploadPage() {
  const copy = useFileUploadCopy();
  const [fileKeyForS3, setFileKeyForS3] = useState<File["s3Key"]>("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [fileToDelete, setFileToDelete] = useState<Pick<
    File,
    "id" | "s3Key" | "name"
  > | null>(null);

  const allUserFiles = useQuery(getAllFilesByUser, undefined, {
    // We disable automatic refetching because otherwise files would be refetched after `createFile` is called and the S3 URL is returned,
    // which happens before the file is actually fully uploaded. Instead, we manually (re)fetch on mount and after the upload is complete.
    enabled: false,
  });
  const { isLoading: isDownloadUrlLoading, refetch: refetchDownloadUrl } =
    useQuery(
      getDownloadFileSignedURL,
      { s3Key: fileKeyForS3 },
      { enabled: false },
    );

  useEffect(() => {
    allUserFiles.refetch();
  }, [allUserFiles]);

  useEffect(() => {
    if (fileKeyForS3.length > 0) {
      refetchDownloadUrl()
        .then((urlQuery) => {
          switch (urlQuery.status) {
            case "error":
              console.error("Error fetching download URL", urlQuery.error);
              toast({
                title: copy.downloadFailed,
                description: copy.tryAgain,
                variant: "destructive",
              });
              return;
            case "success":
              window.open(urlQuery.data, "_blank");
              return;
          }
        })
        .finally(() => {
          setFileKeyForS3("");
        });
    }
  }, [copy, fileKeyForS3, refetchDownloadUrl]);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      const formElement = e.target;
      if (!(formElement instanceof HTMLFormElement)) {
        throw new Error("Event target is not a form element");
      }

      const formData = new FormData(formElement);
      const formDataFileUpload = formData.get("file-upload");

      if (
        !formDataFileUpload ||
        !(formDataFileUpload instanceof File) ||
        formDataFileUpload.size === 0
      ) {
        toast({
          title: copy.noFileSelected,
          description: copy.selectFileFirst,
          variant: "destructive",
        });
        return;
      }

      const file = validateFile(formDataFileUpload);

      const { s3UploadUrl, s3UploadFields, s3Key } = await createFileUploadUrl({
        fileType: file.type,
        fileName: file.name,
      });

      await uploadFileWithProgress({
        file,
        s3UploadUrl,
        s3UploadFields,
        setUploadProgressPercent,
      });

      await addFileToDb({
        s3Key,
        fileType: file.type,
        fileName: file.name,
      });

      formElement.reset();
      allUserFiles.refetch();
      toast({
        title: copy.fileUploaded,
        description: copy.fileUploadedDescription,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : undefined;
      toast({
        title: copy.uploadFailed,
        description: copy.errorMessage(
          errorMessage,
          copy.uploadFailedDescription,
        ),
        variant: "destructive",
      });
    } finally {
      setUploadProgressPercent(0);
    }
  };

  const handleDelete = async ({ id, name }: Pick<File, "id" | "name">) => {
    try {
      await deleteFile({ id });
      toast({
        title: copy.fileDeleted,
        description: copy.fileDeletedDescription(name),
      });
      allUserFiles.refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : undefined;
      toast({
        title: copy.error,
        description: copy.errorMessage(errorMessage, copy.deleteFailed),
        variant: "destructive",
      });
    } finally {
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="text-primary">AWS</span> {copy.title}
            </h2>
          </div>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg leading-8">
            {copy.description}
          </p>
          <Card className="my-8">
            <CardContent className="mx-auto my-10 space-y-10 px-4 py-8 sm:max-w-lg">
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="file-upload"
                    className="text-foreground text-sm font-medium"
                  >
                    {copy.selectFile}
                  </Label>
                  <Input
                    type="file"
                    id="file-upload"
                    name="file-upload"
                    accept={ALLOWED_FILE_TYPES.join(",")}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={uploadProgressPercent > 0}
                    className="w-full"
                  >
                    {uploadProgressPercent > 0
                      ? copy.uploading(uploadProgressPercent)
                      : copy.upload}
                  </Button>
                  {uploadProgressPercent > 0 && (
                    <Progress
                      value={uploadProgressPercent}
                      className="w-full"
                    />
                  )}
                </div>
              </form>
              <div className="border-border border-b-2"></div>
              <div className="col-span-full space-y-4">
                <CardTitle className="text-foreground text-xl font-bold">
                  {copy.uploadedFiles}
                </CardTitle>
                {allUserFiles.isLoading && (
                  <p className="text-muted-foreground">{copy.loading}</p>
                )}
                {allUserFiles.error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {copy.error}:{" "}
                      {copy.errorMessage(
                        allUserFiles.error.message,
                        copy.loadFailed,
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {!!allUserFiles.data &&
                allUserFiles.data.length > 0 &&
                !allUserFiles.isLoading ? (
                  <div className="space-y-3">
                    {allUserFiles.data.map((file: File) => (
                      <Card key={file.s3Key} className="p-4">
                        <div
                          className={cn(
                            "flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center",
                            {
                              "opacity-70":
                                file.s3Key === fileKeyForS3 &&
                                isDownloadUrlLoading,
                            },
                          )}
                        >
                          <p className="text-foreground font-medium">
                            {file.name}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => setFileKeyForS3(file.s3Key)}
                              disabled={
                                file.s3Key === fileKeyForS3 &&
                                isDownloadUrlLoading
                              }
                              variant="outline"
                              size="sm"
                              aria-label={copy.downloadFile}
                            >
                              <Download className="h-5 w-5" />
                            </Button>
                            <Button
                              onClick={() => setFileToDelete(file)}
                              variant="outline"
                              size="sm"
                              aria-label={copy.deleteFile}
                            >
                              <Trash className="text-destructive h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center">
                    {copy.noFiles}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {fileToDelete && (
        <Dialog
          open={!!fileToDelete}
          onOpenChange={(isOpen) => !isOpen && setFileToDelete(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.deleteFile}</DialogTitle>
              <DialogDescription>
                {copy.deleteConfirm(fileToDelete.name)}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFileToDelete(null)}>
                {copy.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(fileToDelete)}
              >
                {copy.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type FileUploadCopy = {
  title: string;
  description: string;
  selectFile: string;
  upload: string;
  uploading: (percent: number) => string;
  uploadedFiles: string;
  loading: string;
  noFiles: string;
  noFileSelected: string;
  selectFileFirst: string;
  fileUploaded: string;
  fileUploadedDescription: string;
  uploadFailed: string;
  uploadFailedDescription: string;
  downloadFailed: string;
  downloadFile: string;
  tryAgain: string;
  fileDeleted: string;
  fileDeletedDescription: (name: string) => string;
  deleteFile: string;
  deleteConfirm: (name: string) => string;
  delete: string;
  cancel: string;
  deleteFailed: string;
  loadFailed: string;
  error: string;
  errorMessage: (message: string | undefined, fallback: string) => string;
};

const fileUploadCopy: Record<"en" | "zh-CN", FileUploadCopy> = {
  en: {
    title: "File Upload",
    description: "Upload, download, and manage private files stored in AWS S3.",
    selectFile: "Select a file to upload",
    upload: "Upload",
    uploading: (percent) => `Uploading ${percent}%`,
    uploadedFiles: "Uploaded files",
    loading: "Loading...",
    noFiles: "No files uploaded yet",
    noFileSelected: "No file selected",
    selectFileFirst: "Select a file to upload.",
    fileUploaded: "File uploaded",
    fileUploadedDescription: "Your file was uploaded successfully.",
    uploadFailed: "File upload failed",
    uploadFailedDescription: "The file could not be uploaded.",
    downloadFailed: "Could not create the download link",
    downloadFile: "Download file",
    tryAgain: "Please try again later.",
    fileDeleted: "File deleted",
    fileDeletedDescription: (name) => `File ${name} was deleted.`,
    deleteFile: "Delete file",
    deleteConfirm: (name) => `Delete ${name}? This action cannot be undone.`,
    delete: "Delete",
    cancel: "Cancel",
    deleteFailed: "The file could not be deleted.",
    loadFailed: "The file list could not be loaded.",
    error: "Error",
    errorMessage: (message, fallback) => message ?? fallback,
  },
  "zh-CN": {
    title: "文件上传",
    description: "上传、下载并管理保存在 AWS S3 中的私有文件。",
    selectFile: "选择要上传的文件",
    upload: "上传文件",
    uploading: (percent) => `正在上传 ${percent}%`,
    uploadedFiles: "已上传文件",
    loading: "正在加载...",
    noFiles: "还没有上传文件",
    noFileSelected: "尚未选择文件",
    selectFileFirst: "请先选择要上传的文件。",
    fileUploaded: "上传成功",
    fileUploadedDescription: "文件已成功上传。",
    uploadFailed: "文件上传失败",
    uploadFailedDescription: "暂时无法上传文件，请检查存储配置。",
    downloadFailed: "无法生成下载链接",
    downloadFile: "下载文件",
    tryAgain: "请稍后重试。",
    fileDeleted: "文件已删除",
    fileDeletedDescription: (name) => `文件 ${name} 已删除。`,
    deleteFile: "删除文件",
    deleteConfirm: (name) => `确定删除 ${name} 吗？此操作无法撤销。`,
    delete: "删除",
    cancel: "取消",
    deleteFailed: "暂时无法删除文件。",
    loadFailed: "暂时无法读取文件列表。",
    error: "错误",
    errorMessage: (_message, fallback) => fallback,
  },
};

function useFileUploadCopy(): FileUploadCopy {
  const { locale } = useI18n();
  return fileUploadCopy[locale];
}
