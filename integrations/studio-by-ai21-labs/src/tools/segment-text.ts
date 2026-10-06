import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let segmentText = SlateTool.create(spec, {
  name: 'Segment Text',
  key: 'segment_text',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized text segmentation API.',
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
      source: z.string().describe('Text to segment or a URL to fetch and segment'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentText: z.string().describe('Content of this segment'),
            segmentType: z.string().optional().describe('Type of segment')
          })
        )
        .describe('List of text segments')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized text segmentation API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
