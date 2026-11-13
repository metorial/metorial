import { googlePubSubDeliveryConfigSchema } from '@slates/google-pubsub';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

const formIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/)
  .max(1024);
export const timestampSchema = z.iso.datetime({ offset: true });
export const formSelectionSchema = z.object({
  formIds: z.array(z.string().trim().min(1)).min(1).max(100).meta({
    title: 'Form IDs',
    description:
      "IDs of up to 100 forms to watch for new responses. The connected Google account must be able to edit each form. To find a form's ID, open the form for editing and copy the part of the address between /d/ and /edit. The link shared with respondents contains a different ID that cannot be used."
  })
});
export const formTargetSchema = z.object({
  formId: formIdSchema,
  ownerId: z.string().min(1)
});
export const watchIdSchema = z.string().regex(/^[a-z0-9-]{4,63}$/);
// watchId and expiresAt are both null while another destination holds the form's watch.
export const formRegistrationSchema = formTargetSchema
  .extend({
    watchId: watchIdSchema.nullable(),
    activatedAt: timestampSchema,
    expiresAt: timestampSchema.nullable(),
    delivery: googlePubSubDeliveryConfigSchema
  })
  .refine(value => (value.watchId === null) === (value.expiresAt === null));
export type FormRegistration = z.infer<typeof formRegistrationSchema>;
export const answerSchema = z.object({
  questionId: z.string().optional(),
  textAnswers: z
    .object({ answers: z.array(z.object({ value: z.string().optional() })).optional() })
    .optional(),
  fileUploadAnswers: z
    .object({
      answers: z
        .array(
          z.object({
            fileId: z.string().optional(),
            fileName: z.string().optional(),
            mimeType: z.string().optional()
          })
        )
        .optional()
    })
    .optional()
});
export const responseSchema = z.object({
  formId: formIdSchema.optional(),
  responseId: z.string().min(1),
  createTime: timestampSchema,
  lastSubmittedTime: timestampSchema,
  respondentEmail: z.string().optional(),
  answers: z.record(z.string(), answerSchema).default({})
});
export const newResponseSchema = responseSchema.extend({
  kind: z.literal('new_response'),
  formId: formIdSchema,
  eventId: z.string().min(1)
});
export const formSyncSchema = z.object({ kind: z.literal('form_sync'), formId: formIdSchema });
export const formStateSchema = z.object({
  version: z.literal(1),
  ownerId: z.string().min(1),
  forms: z.record(
    z.string(),
    z.object({
      activatedAt: timestampSchema,
      cursor: timestampSchema,
      // Response ID to first submission time, kept while the overlap window can return it.
      recentResponses: z.record(z.string().min(1), timestampSchema),
      scan: z
        .object({
          since: timestampSchema,
          startedAt: timestampSchema,
          highWater: timestampSchema,
          pageToken: z.string().min(1),
          restarts: z.number().int().min(0)
        })
        .optional()
    })
  )
});
export type FormState = z.infer<typeof formStateSchema>;

// Preserve the provider's nanosecond precision at the activation boundary.
export const timestampNanos = (value: string): bigint => {
  const match = /^(.*T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw createApiServiceError('Google Forms returned an invalid timestamp.');
  const seconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(seconds))
    throw createApiServiceError('Google Forms returned an invalid timestamp.');
  return BigInt(seconds) * 1000000n + BigInt((match[2] ?? '').padEnd(9, '0'));
};
