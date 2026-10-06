import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let textImprovements = SlateTool.create(spec, {
  name: 'Text Improvements',
  key: 'text_improvements',
  description:
    'DEPRECATED — use `chat_completion` instead. AI21 retired the specialized text improvements API.',
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
      text: z.string().describe('Text to analyze for improvements'),
      types: z
        .array(
          z.enum([
            'fluency',
            'vocabulary/specificity',
            'vocabulary/variety',
            'clarity/short-sentences',
            'clarity/conciseness'
          ])
        )
        .min(1)
        .describe('Types of improvements to suggest')
    })
  )
  .output(
    z.object({
      improvements: z
        .array(
          z.object({
            originalText: z.string().describe('Original text that can be improved'),
            suggestions: z
              .array(
                z.object({
                  text: z.string().describe('Suggested replacement text')
                })
              )
              .describe('Suggested improvements'),
            improvementType: z.string().optional().describe('Type of improvement'),
            startIndex: z.number().optional().describe('Start index of the original text'),
            endIndex: z.number().optional().describe('End index of the original text')
          })
        )
        .describe('List of improvement suggestions')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'AI21 retired the specialized text improvements API. Use chat_completion with explicit task instructions and context, or maestro_run with validation requirements.'
    );
  })
  .build();
