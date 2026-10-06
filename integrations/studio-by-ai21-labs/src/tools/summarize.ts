import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let summarize = SlateTool.create(spec, {
  name: 'Summarize Text',
  key: 'summarize',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized summarization API.',
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
      source: z.string().describe('Text to summarize or a URL to fetch and summarize'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL'),
      focus: z.string().optional().describe('Keyword or topic to focus the summary on')
    })
  )
  .output(
    z.object({
      summary: z.string().describe('Generated summary')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized summarization API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
