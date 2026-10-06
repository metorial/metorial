import { z } from 'zod';

export const modelInput = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Current TextCortex model ID. Call list_models to discover available IDs. If omitted, an available model is selected from the current catalog.'
  );

export const generationMetadata = {
  balanceWarning: z
    .string()
    .optional()
    .describe('Warning when credit balance retrieval was unavailable'),
  completionId: z.string().describe('Provider completion ID'),
  model: z.string().describe('Model that generated the result'),
  usage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional()
    })
    .optional()
    .describe('Token usage reported by the provider')
};

export const modelSchema = z.object({
  id: z.string(),
  object: z.literal('model'),
  created: z.number().int(),
  owned_by: z.string()
});

export const modelDetailSchema = modelSchema.extend({
  served_from_country_code: z.string().nullable(),
  deployment_jurisdiction: z.string().nullable()
});
