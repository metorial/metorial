import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let paraphrase = SlateTool.create(spec, {
  name: 'Paraphrase Text',
  key: 'paraphrase',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized paraphrasing API.',
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
      text: z.string().describe('Text to paraphrase'),
      style: z
        .enum(['general', 'casual', 'formal', 'short', 'long'])
        .optional()
        .describe('Paraphrasing style'),
      startIndex: z
        .number()
        .int()
        .optional()
        .describe('Start character index for subsection paraphrasing'),
      endIndex: z
        .number()
        .int()
        .optional()
        .describe('End character index for subsection paraphrasing')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            text: z.string().describe('Paraphrased text')
          })
        )
        .describe('List of paraphrase suggestions')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized paraphrasing API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
