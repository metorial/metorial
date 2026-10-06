import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contextualAnswer = SlateTool.create(spec, {
  name: 'Contextual Answer',
  key: 'contextual_answer',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized contextual answers API.',
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
      context: z.string().describe('Context document or text to search for the answer'),
      question: z.string().describe('Question to answer from the context')
    })
  )
  .output(
    z.object({
      answerId: z.string().optional().describe('Unique identifier for this answer request'),
      answer: z
        .string()
        .optional()
        .describe('The answer found in the context, or null if not found'),
      answerFound: z.boolean().describe('Whether an answer was found in the context')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized contextual answers API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
