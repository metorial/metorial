import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sample = z.object({
  type: z.enum(['text', 'image']),
  value: z.string().min(1).describe('Text content or image URL')
});

export let classifyContent = SlateTool.create(spec, {
  name: 'Classify Content',
  key: 'classify_content',
  description:
    'Classify a batch of text or images using custom text labels or example images. Each prediction corresponds to an input sample. All dataset samples must have the same type.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataset: z
        .array(sample)
        .min(1)
        .max(32)
        .describe('Up to 32 text samples or image URLs, all of the same type'),
      labels: z
        .array(
          sample.extend({
            key: z
              .union([z.string(), z.number()])
              .optional()
              .describe('Labels with the same key form one class'),
            text: z.string().optional().describe('Additional context for an image label')
          })
        )
        .min(2)
        .max(24)
        .describe('Between 2 and 24 labels; at least two distinct classes after merging keys'),
      multipleLabels: z
        .boolean()
        .optional()
        .describe('Allow more than one label for each sample'),
      task: z.string().optional().describe('Instruction describing the classification task')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      predictions: z
        .array(z.union([z.string(), z.array(z.string())]))
        .describe('Predictions in the same order as the dataset'),
      rawResponse: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.classify(ctx.input);
    return {
      output: {
        success: result.success,
        predictions: result.predictions,
        rawResponse: result
      },
      message: `Classified **${result.predictions.length} samples**.`
    };
  })
  .build();
