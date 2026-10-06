import { z } from 'zod';
export const fileSchema = z.object({
  fileId: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  url: z.string().min(1),
  fileType: z.string(),
  size: z.number().int().nonnegative().safe(),
  type: z.enum(['file', 'file-version']).optional(),
  thumbnail: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  mime: z.string().optional(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  AITags: z.array(z.unknown()).nullable().optional(),
  isPrivateFile: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  customCoordinates: z.string().nullable().optional(),
  customMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
  extensionStatus: z.record(z.string(), z.unknown()).nullable().optional(),
  versionInfo: z
    .object({ id: z.string().min(1), name: z.string() })
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export type File = z.infer<typeof fileSchema>;
export const fieldSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  label: z.string(),
  schema: z.record(z.string(), z.unknown()),
  description: z.string().optional(),
  reserved: z.boolean().optional()
});
export const metadataSchema = z.object({
  height: z.number().optional(),
  width: z.number().optional(),
  size: z.number().optional(),
  format: z.string().optional(),
  hasColorProfile: z.boolean().optional(),
  quality: z.number().optional(),
  density: z.number().optional(),
  hasTransparency: z.boolean().optional(),
  pHash: z.string().optional(),
  exif: z.record(z.string(), z.unknown()).nullable().optional(),
  bitRate: z.number().optional(),
  duration: z.number().optional(),
  audioCodec: z.string().optional(),
  videoCodec: z.string().optional()
});
export const jobSchema = z.object({
  jobId: z.string().min(1),
  type: z.string(),
  status: z.string(),
  purgeRequestId: z.string().optional(),
  message: z.string().optional()
});
export const batchSchema = z.object({
  successfullyDeletedFileIds: z.array(z.string()).optional(),
  successfullyUpdatedFileIds: z.array(z.string()).optional(),
  errors: z.array(z.object({ fileId: z.string(), error: z.string() })).optional()
});
