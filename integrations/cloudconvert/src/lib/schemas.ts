import { z } from 'zod';

export const environmentSchema = z.enum(['production', 'sandbox']);
export const environmentInput = environmentSchema
  .default('production')
  .describe(
    'CloudConvert API environment. Sandbox uses its own API key and only whitelisted files.'
  );
export const resourceId = z
  .string()
  .min(1)
  .max(200)
  .describe('Exact ID returned by CloudConvert.');
export const statusSchema = z.enum(['waiting', 'processing', 'finished', 'error']);
const optionalText = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
export const fileSchema = z.object({ filename: z.string().min(1), url: optionalText });
export const taskSchema = z.object({
  id: resourceId,
  job_id: optionalText,
  name: optionalText,
  operation: z.string().min(1),
  status: statusSchema,
  message: optionalText,
  code: optionalText,
  credits: z
    .number()
    .int()
    .safe()
    .nonnegative()
    .nullish()
    .transform(value => value ?? undefined),
  percent: z
    .number()
    .min(0)
    .max(100)
    .nullish()
    .transform(value => value ?? undefined),
  created_at: optionalText,
  started_at: optionalText,
  ended_at: optionalText,
  retry_of_task_id: optionalText,
  retries: z
    .array(z.object({ id: resourceId }))
    .nullish()
    .transform(value => value ?? undefined),
  result: z
    .object({
      files: z.array(fileSchema).optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
    .nullish()
    .transform(value => value ?? undefined)
});
export const jobSchema = z.object({
  id: resourceId,
  status: statusSchema,
  tag: optionalText,
  created_at: optionalText,
  started_at: optionalText,
  ended_at: optionalText,
  tasks: z.array(taskSchema)
});
export const userSchema = z.object({
  id: z.union([z.string().min(1), z.number().int().safe().nonnegative()]).transform(String),
  username: z.string().min(1),
  email: z.string().min(1),
  credits: z
    .number()
    .int()
    .safe()
    .nonnegative()
    .nullish()
    .transform(value => value ?? undefined),
  created_at: optionalText
});
export const paginationSchema = z.object({
  current_page: z.number().int().safe().positive(),
  total: z.number().int().safe().nonnegative().optional()
});
export const linksSchema = z.object({ next: z.string().nullable() });
export const jobPageSchema = z.object({
  data: z.array(jobSchema),
  meta: paginationSchema,
  links: linksSchema
});
export const taskPageSchema = z.object({
  data: z.array(taskSchema),
  meta: paginationSchema,
  links: linksSchema
});
export const formatSchema = z.object({
  input_format: z.string().min(1),
  output_format: z.string().min(1),
  engine: z.string().min(1),
  engine_version: optionalText
});
export const resultFileOutput = z.object({
  filename: z.string(),
  url: z
    .string()
    .optional()
    .describe('Provider URL expires when the job is deleted, normally after 24 hours.')
});
export const taskOutput = z.object({
  taskId: z.string(),
  jobId: z.string().optional(),
  taskName: z.string().optional(),
  operation: z.string(),
  status: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  credits: z.number().optional(),
  progress: z.number().optional(),
  retryOfTaskId: z.string().optional(),
  retryTaskIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  endedAt: z.string().optional(),
  resultFiles: z.array(resultFileOutput).optional()
});
export const singleFileOutput = z.object({
  jobId: z.string(),
  status: z.string(),
  resultUrl: z
    .string()
    .optional()
    .describe('Provider URL expires when the job is deleted, normally after 24 hours.'),
  resultFilename: z.string().optional(),
  files: z.array(resultFileOutput).optional()
});
export const sourceUrl = z
  .string()
  .min(1)
  .describe('Public HTTP or HTTPS source URL accessible to CloudConvert.');
export const waitInput = z
  .boolean()
  .optional()
  .default(true)
  .describe(
    'Wait up to 60 seconds. For long jobs use false, then get_job with the returned job ID.'
  );
export const optionsInput = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Documented engine-specific options; cannot override operation, input, or explicitly supplied fields.'
  );
export const tagInput = z
  .string()
  .max(255)
  .optional()
  .describe(
    'Job tag for finding an uncertain creation with list_jobs. Use a unique value before creating a job.'
  );
export const pageInput = z.number().int().safe().positive().optional().default(1);
export const perPageInput = z.number().int().min(1).max(1000).optional().default(25);
export type Job = z.infer<typeof jobSchema>;
export type Task = z.infer<typeof taskSchema>;
