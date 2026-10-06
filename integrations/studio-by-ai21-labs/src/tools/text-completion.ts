import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let penaltySchema = z
  .object({
    scale: z.number().describe('Penalty strength'),
    applyToWhitespaces: z.boolean().optional().describe('Apply penalty to whitespace tokens'),
    applyToPunctuations: z
      .boolean()
      .optional()
      .describe('Apply penalty to punctuation tokens'),
    applyToNumbers: z.boolean().optional().describe('Apply penalty to number tokens'),
    applyToStopwords: z.boolean().optional().describe('Apply penalty to stopword tokens'),
    applyToEmojis: z.boolean().optional().describe('Apply penalty to emoji tokens')
  })
  .describe('Penalty configuration');

export let textCompletion = SlateTool.create(spec, {
  name: 'Text Completion',
  key: 'text_completion',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the Jurassic-2 text completion API.',
  instructions: [
    'Use chat_completion with task instructions and supplied context, or maestro_run with validation requirements. These APIs do not reproduce the retired response semantics automatically.'
  ],
  tags: {
    deprecated: true,
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.enum(['j2-light', 'j2-mid', 'j2-ultra']).describe('Jurassic-2 model to use'),
      prompt: z.string().describe('Text prompt to complete'),
      maxTokens: z.number().int().optional().describe('Maximum tokens in the completion'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Sampling temperature (0.0-1.0)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold'),
      numResults: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Number of completions to generate'),
      stopSequences: z.array(z.string()).optional().describe('Sequences that stop generation'),
      presencePenalty: penaltySchema.optional().describe('Penalty for tokens already present'),
      countPenalty: penaltySchema.optional().describe('Penalty proportional to token count'),
      frequencyPenalty: penaltySchema
        .optional()
        .describe('Penalty proportional to token frequency')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique request identifier'),
      completions: z
        .array(
          z.object({
            text: z.string().describe('Generated completion text'),
            finishReason: z.string().optional().describe('Reason generation stopped')
          })
        )
        .describe('Generated completions')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the Jurassic-2 text completion API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
