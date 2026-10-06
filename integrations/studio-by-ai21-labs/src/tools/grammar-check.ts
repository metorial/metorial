import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let grammarCheck = SlateTool.create(spec, {
  name: 'Grammar Check',
  key: 'grammar_check',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized grammar correction API.',
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
      text: z.string().describe('Text to check for grammatical errors')
    })
  )
  .output(
    z.object({
      corrections: z
        .array(
          z.object({
            originalText: z.string().describe('Original text containing the error'),
            suggestion: z.string().describe('Suggested correction'),
            correctionType: z
              .string()
              .describe('Type of correction (e.g. Grammar, Spelling, Punctuation)'),
            startIndex: z.number().describe('Start character index of the error'),
            endIndex: z.number().describe('End character index of the error')
          })
        )
        .describe('List of corrections found')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized grammar correction API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
