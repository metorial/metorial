import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let extractionFieldSchema = z.object({
  key: z.string().describe('Unique identifier for the field'),
  description: z.string().describe('Context about what data this field should capture'),
  example: z.string().optional().describe('Sample value demonstrating expected output'),
  type: z.enum(['string', 'object', 'array']).optional().describe('Field type')
});

export let updateExtractionTool = SlateTool.create(spec, {
  name: 'Update Extraction',
  key: 'update_extraction',
  description: `Update an existing extraction template. Only the provided parameters will be modified; omitted parameters remain unchanged. Use this to adjust fields, options, language, or name.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('Unique identifier of the extraction to update'),
      name: z.string().optional().describe('New name for the extraction'),
      description: z.string().optional().describe('New description for the extraction'),
      language: z.string().optional().describe('New document language'),
      fields: z.array(extractionFieldSchema).optional().describe('Updated fields to extract'),
      options: z
        .object({
          hasTable: z.boolean().optional(),
          hasVisuals: z.boolean().optional(),
          handwrittenTextRecognition: z.boolean().optional(),
          checkboxRecognition: z.boolean().optional(),
          longDocument: z.boolean().optional(),
          splitPdfPages: z.boolean().optional(),
          specificPageProcessing: z.boolean().optional(),
          from: z.number().optional(),
          to: z.number().optional()
        })
        .optional()
        .describe('Updated processing options')
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Unique identifier of the updated extraction'),
      status: z.string().describe('Update status'),
      updatedAt: z.number().describe('Timestamp of update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.updateExtraction({
      extractionId: ctx.input.extractionId,
      name: ctx.input.name,
      description: ctx.input.description,
      language: ctx.input.language,
      fields: ctx.input.fields,
      options: ctx.input.options
    });

    return {
      output: {
        extractionId: result.extractionId,
        status: result.status,
        updatedAt: result.updatedAt
      },
      message: `Updated extraction \`${ctx.input.extractionId}\`.`
    };
  })
  .build();
