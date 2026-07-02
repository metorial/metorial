import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let viewExtractionTool = SlateTool.create(spec, {
  name: 'View Extraction',
  key: 'view_extraction',
  description: `Retrieve the details of an existing extraction template, including its name, language, processing options, defined fields, and batch information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('Unique identifier of the extraction to view')
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Unique identifier of the extraction'),
      name: z.string().describe('Name of the extraction template'),
      description: z.string().optional().describe('Description of the extraction'),
      language: z
        .string()
        .optional()
        .describe('Document language configured for this extraction'),
      status: z.string().optional().describe('Current status of the extraction'),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Processing options configured'),
      fields: z
        .array(
          z.object({
            key: z.string(),
            description: z.string().optional(),
            example: z.string().optional()
          })
        )
        .optional()
        .describe('Fields configured for extraction'),
      batches: z
        .record(
          z.string(),
          z.object({
            filesNo: z.number().optional(),
            origin: z.string().optional(),
            startTime: z.string().optional(),
            status: z.string().optional()
          })
        )
        .optional()
        .describe('Batch processing information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.viewExtraction(ctx.input.extractionId);
    let details = result.extractionDetails || {};

    return {
      output: {
        extractionId: result.extractionId,
        name: details.name,
        description: details.description,
        language: details.language,
        status: details.status,
        options: details.options,
        fields: details.fields,
        batches: details.batches
      },
      message: `Extraction **${details.name || ctx.input.extractionId}** — status: ${details.status || 'unknown'}, ${details.fields?.length || 0} fields configured.`
    };
  })
  .build();
