import { z } from 'zod';

export let predictionInputSchema = z.object({
  type: z.enum(['name', 'email', 'username']).describe('Kind of value to analyze'),
  value: z.string().min(1).max(254).regex(/\S/).describe('Name, email address or username'),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .describe('Uppercase ISO 3166-1 alpha-2 country context'),
  aiMode: z
    .enum(['off', 'fallback', 'always'])
    .optional()
    .describe('AI mode: single requests default to fallback; batch items default to off'),
  forceToGenderize: z
    .boolean()
    .optional()
    .describe('Allow nickname or alias inference; requires AI fallback mode')
});

export let predictionSchema = z
  .object({
    input: z
      .object({
        type: z.enum(['name', 'email', 'username']),
        value: z.string(),
        country: z.string().nullable(),
        forceToGenderize: z.boolean().optional()
      })
      .passthrough(),
    name: z.string().nullable(),
    gender: z.enum(['male', 'female']).nullable(),
    country: z.string().nullable(),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .nullable()
      .describe('Confidence from 0 to 1, when available'),
    confidence_kind: z.enum(['observed_frequency', 'model_reported']).nullable(),
    sample_count: z.number().int().nonnegative().nullable(),
    source: z.enum(['dataset', 'ai', 'none']),
    result_status: z.enum(['identified', 'unknown']).optional(),
    reason: z
      .enum(['not_found', 'no_name_candidate', 'ambiguous', 'insufficient_evidence'])
      .nullable()
      .optional(),
    country_source: z.enum(['dataset', 'ai_association']).nullable().optional(),
    match: z
      .object({
        name: z.string().nullable(),
        method: z.enum(['normalized', 'token', 'substring', 'model_inference']).nullable(),
        scope: z.enum(['country', 'global']).nullable(),
        country: z.string().nullable()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export let usageSchema = z
  .object({
    charged_credits: z.number().int().nonnegative().nullable(),
    remaining_credits: z.number().int().nullable(),
    billing_status: z.enum(['not_charged', 'confirmed', 'unconfirmed']).optional(),
    resets_at: z.string().nullable().optional(),
    limit: z.number().int().nonnegative().nullable().optional(),
    period_seconds: z.number().int().positive().nullable().optional()
  })
  .passthrough();

export let metaSchema = z
  .object({
    request_id: z.string(),
    duration_ms: z.number().int().nonnegative(),
    usage: usageSchema,
    access: z
      .object({
        mode: z.enum(['api_key', 'ip_trial', 'unauthenticated']),
        reason: z.enum(['api_key_missing', 'api_key_invalid', 'api_key_not_found']).nullable()
      })
      .passthrough()
      .optional(),
    summary: z
      .object({
        total: z.number().int().min(0).max(50),
        succeeded: z.number().int().min(0).max(50),
        identified: z.number().int().min(0).max(50),
        unknown: z.number().int().min(0).max(50),
        failed: z.number().int().min(0).max(50)
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export let predictionResponseSchema = z
  .object({ data: predictionSchema, meta: metaSchema })
  .passthrough();

let itemProblemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    detail: z.string(),
    instance: z.string(),
    code: z.string(),
    request_id: z.string(),
    documentation: z.string().optional(),
    action: z.string().optional(),
    errors: z
      .array(z.object({ pointer: z.string(), message: z.string() }).passthrough())
      .optional()
  })
  .passthrough();

export let predictionBatchResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            id: z.string().optional(),
            charged_credits: z.number().int().min(0).max(2).optional(),
            data: predictionSchema.optional(),
            error: itemProblemSchema.optional()
          })
          .passthrough()
          .refine(item => (item.data === undefined) !== (item.error === undefined), {
            message: 'A batch item must contain exactly one prediction or error'
          })
      )
      .min(1)
      .max(50),
    meta: metaSchema
  })
  .passthrough();

export type PredictionInput = z.infer<typeof predictionInputSchema>;
