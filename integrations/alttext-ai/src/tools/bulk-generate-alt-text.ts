import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkGenerateAltText = SlateTool.create(spec, {
  name: 'Bulk Generate Alt Text',
  key: 'bulk_generate_alt_text',
  description:
    'Submit a CSV of image URLs for batch alt text generation. Returns upload acceptance, processed row count, and per-row errors; final alt text is generated separately.',
  instructions: [
    'Use the AltText.ai CSV template. Valid rows are processed even when other rows have errors. Use list_images or search_images to retrieve generated results.'
  ],
  constraints: [
    'The provider accepts at most 100,000 rows. Image processing consumes account credits.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      csvContent: z
        .string()
        .describe('CSV text containing image URLs, using the provider template'),
      email: z.string().optional().describe('Email address to receive bulk upload results')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload was accepted'),
      rows: z.number().describe('Number of rows processed'),
      rowErrors: z
        .array(z.array(z.union([z.number(), z.string()])))
        .optional()
        .describe('Row number and error message pairs'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider bulk upload response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).bulkCreate(ctx.input.csvContent, ctx.input.email);
    if (typeof result.success !== 'boolean' || typeof result.rows !== 'number')
      throw createApiServiceError('AltText.ai returned invalid CSV upload results.');
    return {
      output: {
        success: result.success,
        rows: result.rows,
        rowErrors: Array.isArray(result.row_errors) ? result.row_errors : undefined,
        raw: result
      },
      message: `CSV upload ${result.success ? 'accepted' : 'not accepted'}: **${result.rows}** rows processed.`
    };
  })
  .build();
