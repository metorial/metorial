import { z } from 'zod';

const nativeId = z.number().int().positive().safe();
const optionalText = z.string().nullable().optional();
export const documentSchema = z
  .object({
    name: z.string().optional(),
    filename: z.string().optional(),
    url: z.string().optional(),
    id: nativeId.optional(),
    uuid: z.string().optional()
  })
  .passthrough();
export const fieldSchema = z
  .object({
    name: z.string(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    role: z.string().optional()
  })
  .passthrough();
export const templateSummarySchema = z.object({
  id: nativeId,
  name: z.string(),
  slug: z.string().optional(),
  external_id: optionalText,
  folder_name: optionalText,
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: optionalText
});
export const templateSchema = templateSummarySchema.extend({
  fields: z.array(fieldSchema),
  submitters: z.array(
    z.object({ name: z.string(), uuid: z.string().optional() }).passthrough()
  ),
  documents: z.array(documentSchema)
});
export const submitterSchema = z.object({
  id: nativeId,
  submission_id: nativeId.optional(),
  uuid: z.string().optional(),
  slug: z.string().optional(),
  email: optionalText,
  name: optionalText,
  phone: optionalText,
  status: z.string().optional(),
  role: z.string().optional(),
  external_id: optionalText,
  sent_at: optionalText,
  opened_at: optionalText,
  completed_at: optionalText,
  declined_at: optionalText,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  embed_src: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  values: z.array(z.object({ field: z.string(), value: z.unknown() })).optional(),
  documents: z.array(documentSchema).optional(),
  submission_events: z
    .array(
      z.object({
        id: nativeId.optional(),
        event_type: z.string().optional(),
        event_timestamp: z.string().optional()
      })
    )
    .optional(),
  template: z.object({ id: nativeId, name: z.string().optional() }).optional()
});
export const submissionSchema = z.object({
  id: nativeId,
  name: optionalText,
  slug: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  completed_at: optionalText,
  expire_at: optionalText,
  created_at: z.string(),
  updated_at: z.string().optional(),
  archived_at: optionalText,
  audit_log_url: optionalText,
  combined_document_url: optionalText,
  template_id: nativeId.optional(),
  template: z.object({ id: nativeId, name: z.string().optional() }).optional(),
  submitters: z.array(submitterSchema)
});
export const receiptSchema = z.object({
  id: nativeId,
  updated_at: z.string().optional(),
  archived_at: optionalText
});
export const paginationSchema = z.object({
  count: z.number().int().nonnegative().safe(),
  next: nativeId.nullable().optional(),
  prev: nativeId.nullable().optional()
});
export type NativeTemplate = z.infer<typeof templateSchema>;
export type NativeSubmission = z.infer<typeof submissionSchema>;
export type NativeSubmitter = z.infer<typeof submitterSchema>;
