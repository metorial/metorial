import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let summarizeBySegment = SlateTool.create(spec, {
  name: 'Summarize by Segment',
  key: 'summarize_by_segment',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized segment summarization API.',
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
      source: z.string().describe('Text to segment and summarize, or a URL to fetch'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL'),
      focus: z.string().optional().describe('Keyword or topic to focus the summaries on')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentText: z.string().describe('Original segment text'),
            summary: z.string().describe('Summary of the segment'),
            highlights: z
              .array(z.string())
              .optional()
              .describe('Key highlights from the segment')
          })
        )
        .describe('Summarized segments')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized segment summarization API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
