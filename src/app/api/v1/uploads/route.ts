import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { extname, join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

import { authorizeRequest } from "@/server/auth";
import { apiError, apiResponse, handleOptions } from "@/server/api";

export const runtime = "nodejs";

const uploadKinds = {
  "course-thumbnail": {
    directory: "images",
    mimePrefix: "image/",
    maxBytes: 10 * 1024 * 1024
  },
  "lesson-thumbnail": {
    directory: "images",
    mimePrefix: "image/",
    maxBytes: 10 * 1024 * 1024
  },
  "lesson-video": {
    directory: "videos",
    mimePrefix: "video/",
    maxBytes: 1024 * 1024 * 1024
  }
} as const;

type UploadKind = keyof typeof uploadKinds;

function isUploadKind(value: string): value is UploadKind {
  return value in uploadKinds;
}

function getSafeExtension(file: File) {
  const fileExtension = extname(file.name).toLowerCase();

  if (fileExtension) {
    return fileExtension.replace(/[^.a-z0-9]/g, "");
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return mimeExtension ? `.${mimeExtension}` : ".bin";
}

async function writeFileToDisk(file: File, destinationPath: string) {
  const sourceStream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
  const targetStream = createWriteStream(destinationPath);

  await finished(sourceStream.pipe(targetStream));
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, ["ADMIN", "INSTRUCTOR"], {
    requiredPermission: "academy.courses.create"
  });

  if ("error" in auth) {
    return auth.error;
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");
  const kindValue = formData.get("kind");

  if (!(fileValue instanceof File)) {
    return apiError("A file is required", 422);
  }

  if (typeof kindValue !== "string" || !isUploadKind(kindValue)) {
    return apiError("Invalid upload type", 422);
  }

  const config = uploadKinds[kindValue];

  if (!fileValue.type.startsWith(config.mimePrefix)) {
    return apiError(`Invalid file type for ${kindValue}`, 422);
  }

  if (fileValue.size <= 0) {
    return apiError("Uploaded file is empty", 422);
  }

  if (fileValue.size > config.maxBytes) {
    return apiError(`File is too large. Max allowed is ${Math.floor(config.maxBytes / (1024 * 1024))} MB`, 413);
  }

  const uploadDirectory = join(process.cwd(), "public", "uploads", config.directory);
  await mkdir(uploadDirectory, { recursive: true });

  const extension = getSafeExtension(fileValue);
  const savedFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const absolutePath = join(uploadDirectory, savedFileName);

  await writeFileToDisk(fileValue, absolutePath);

  return apiResponse(
    {
      success: true,
      data: {
        url: `/uploads/${config.directory}/${savedFileName}`,
        name: fileValue.name,
        size: fileValue.size,
        type: fileValue.type
      }
    },
    { status: 201 }
  );
}

export const OPTIONS = handleOptions;
