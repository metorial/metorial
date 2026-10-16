import { z } from 'zod';

let error = z.string().nullable();
let file = z
  .object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    exists: z.boolean()
  })
  .passthrough();

export let fileUploadSchema = z.object({ error, file_id: z.string().min(1) }).passthrough();
export let fileInfoSchema = z
  .object({
    preview: z.boolean(),
    size: z.number(),
    name: z.string(),
    previewData: z.array(z.string()).optional()
  })
  .passthrough();
export let taskCreateSchema = z
  .object({
    error,
    task_id: z.string().min(1),
    sandbox: z.boolean().optional(),
    message: z.string().optional()
  })
  .passthrough();
export let taskStatusSchema = z
  .object({
    error,
    status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'ERROR']),
    file_id: z.string().nullable(),
    conversionProgress: z.number()
  })
  .passthrough();
export let taskDetailSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'ERROR']),
    error,
    url: z.string().nullable(),
    dateCreated: z.string(),
    dateFinished: z.string().nullable(),
    conversionProgress: z.number(),
    fileSource: file.optional(),
    fileResult: file.nullable().optional(),
    retentionMode: z.string(),
    cleanupStatus: z.string(),
    dateDeleted: z.string().nullable(),
    dateExpires: z.string().nullable()
  })
  .passthrough();
export let taskListSchema = z.object({ error, data: z.array(taskDetailSchema) }).passthrough();
export let taskRetentionSchema = z
  .object({
    error,
    retentionMode: z.string(),
    dateExpires: z.string()
  })
  .passthrough();
export let taskDeleteSchema = z
  .object({
    error,
    message: z.string(),
    dateDeleted: z.string()
  })
  .passthrough();
export let configSchema = z
  .object({
    error,
    conversions: z.array(
      z
        .object({
          type: z.string(),
          title: z.string(),
          options: z.array(z.union([z.record(z.string(), z.unknown()), z.string()]))
        })
        .passthrough()
    )
  })
  .passthrough();
export let authSchema = z.object({ error, email: z.string().min(1) }).passthrough();

export type TaskStatus = z.infer<typeof taskStatusSchema>;
