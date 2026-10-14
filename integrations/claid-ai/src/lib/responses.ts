import type { SlateAddAttachmentInput } from 'slates';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let fileSchema = z
  .object({
    format: z.string().optional(),
    ext: z.string().optional(),
    mime: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    mps: z.number().optional(),
    tmp_url: z.string().optional(),
    claid_storage_uri: z.string().optional(),
    generated_prompt: z.string().optional()
  })
  .passthrough();

export let acceptedResponseSchema = z.object({
  data: z.object({
    id: z.number(),
    status: z.string(),
    result_url: z.string(),
    created_at: z.string()
  })
});

export let jobResponseSchema = z.object({
  data: z.object({
    id: z.number(),
    status: z.string(),
    created_at: z.string().optional(),
    errors: z
      .array(z.object({ error: z.string(), created_at: z.string().optional() }))
      .optional(),
    result: z
      .object({
        input_object: fileSchema.optional(),
        input_objects: z.array(fileSchema).optional(),
        output_object: fileSchema.optional(),
        output_objects: z.array(fileSchema).optional()
      })
      .optional()
  })
});

export let storageSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional()
});

export let jobOutputSchema = z.object({
  taskId: z.number().describe('Task ID'),
  status: z.string().describe('Current processing status'),
  createdAt: z.string().optional().describe('Task creation timestamp'),
  errors: z
    .array(z.object({ error: z.string(), createdAt: z.string().optional() }))
    .optional()
    .describe('Any errors encountered during processing'),
  result: z
    .object({
      inputObjects: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Input file metadata'),
      outputObjects: z
        .array(
          z.object({
            format: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            temporaryUrl: z.string().optional(),
            storageUri: z.string().optional(),
            mimeType: z.string().optional()
          })
        )
        .optional()
        .describe('Output file metadata and URLs'),
      generatedPrompt: z.string().optional().describe('Auto-generated prompt (for video)')
    })
    .optional()
    .describe('Job result (available when processing completes)')
});

export let mapFile = (file: z.infer<typeof fileSchema>) => ({
  format: file.format || file.ext,
  width: file.width,
  height: file.height,
  temporaryUrl: file.tmp_url,
  storageUri: file.claid_storage_uri,
  mimeType: file.mime
});

export let mapJob = (data: z.infer<typeof jobResponseSchema>['data']) => {
  let result = data.result;
  return {
    taskId: data.id,
    status: data.status,
    createdAt: data.created_at,
    errors: data.errors?.length
      ? data.errors.map(error => ({ error: error.error, createdAt: error.created_at }))
      : undefined,
    result: result
      ? {
          inputObjects:
            result.input_objects || (result.input_object ? [result.input_object] : undefined),
          outputObjects: (
            result.output_objects ||
            (result.output_object ? [result.output_object] : undefined)
          )?.map(mapFile),
          generatedPrompt: result.input_object?.generated_prompt
        }
      : undefined
  };
};

export let addResultFiles = async (
  ctx: { addAttachment: (input: SlateAddAttachmentInput) => Promise<void> },
  files: z.infer<typeof fileSchema>[]
) => {
  for (let file of files) {
    if (file.tmp_url) {
      await ctx.addAttachment({ type: 'url', url: file.tmp_url, mimeType: file.mime });
    }
  }
};

export let validateWholeNumber = (value: number | undefined, field: string) => {
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw createApiServiceError(`${field} must be a whole number.`);
  }
};
