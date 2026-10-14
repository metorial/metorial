import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractEntities = SlateTool.create(spec, {
  name: 'Extract Entities',
  key: 'extract_entities',
  description:
    'Extract structured entities from text using a deployed Metatext AI extraction project through the V2 Inference API. Returns the model predictions and metadata in their original form.',
  instructions: [
    'Find the project ID and any model name in your Metatext AI project deployment details.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().min(1).describe('The deployed extraction project ID'),
      text: z.string().min(1).describe('The text to extract entities from'),
      model: z.string().min(1).optional().describe('Optional model name for the project'),
      options: z
        .object({
          refresh: z.boolean().optional().describe('Whether to refresh the inference model')
        })
        .optional()
        .describe('Optional V2 extraction settings')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Prediction objects returned by the extraction model'),
      metadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Additional extraction metadata, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.extractEntities(
      ctx.input.projectId,
      ctx.input.text,
      ctx.input.model,
      ctx.input.options
    );
    return {
      output: result,
      message: `Extracted entities with project **${ctx.input.projectId}**.`
    };
  })
  .build();
