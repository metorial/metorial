import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let classifyText = SlateTool.create(spec, {
  name: 'Classify Text',
  key: 'classify_text',
  description:
    'Classify text using a deployed Metatext AI project through the V2 Inference API. Returns the model predictions in their original form.',
  instructions: [
    'Find the project ID and any model name in your Metatext AI project deployment details.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().min(1).describe('The deployed classification project ID'),
      text: z.string().min(1).describe('The text to classify'),
      model: z.string().min(1).optional().describe('Optional model name for the project'),
      options: z
        .object({
          threshold: z.number().optional().describe('Optional prediction score threshold'),
          top_labels: z
            .number()
            .refine(
              value => Number.isSafeInteger(value) && value > 0,
              'Provide a positive whole number'
            )
            .optional()
            .describe('Optional maximum number of predicted labels'),
          refresh: z.boolean().optional().describe('Whether to refresh the inference model'),
          version: z.string().optional().describe('Optional model version')
        })
        .optional()
        .describe('Optional V2 classification settings')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Prediction objects returned by the classification model'),
      metadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Additional model metadata, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.classifyText(
      ctx.input.projectId,
      ctx.input.text,
      ctx.input.model,
      ctx.input.options
    );
    return {
      output: result,
      message: `Classified text with project **${ctx.input.projectId}**.`
    };
  })
  .build();
