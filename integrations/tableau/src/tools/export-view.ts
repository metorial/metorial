import { createBase64Attachment, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let filterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

let pdfPageTypeSchema = z.enum([
  'A3',
  'A4',
  'A5',
  'B5',
  'Executive',
  'Folio',
  'Ledger',
  'Legal',
  'Letter',
  'Note',
  'Quarto',
  'Tabloid'
]);

export let exportView = SlateTool.create(spec, {
  name: 'Export View',
  key: 'export_view',
  description: `Export a Tableau view as CSV data, a PNG image, or a PDF file attachment. Supports Tableau view filter query parameters and cache max-age controls.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      viewId: z.string().describe('LUID of the view to export'),
      format: z.enum(['csv', 'image', 'pdf']).describe('Export format to retrieve'),
      maxAgeMinutes: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Minimum cache age before Tableau refreshes the exported view'),
      filters: z
        .record(z.string(), filterValueSchema)
        .optional()
        .describe('View filters keyed by field name; sent as vf_<field>=value'),
      imageResolution: z
        .enum(['high'])
        .optional()
        .describe('Set to "high" for maximum PNG pixel density'),
      vizHeight: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Rendered PDF height in pixels'),
      vizWidth: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Rendered PDF width in pixels'),
      pdfPageType: pdfPageTypeSchema.optional().describe('PDF page size'),
      pdfOrientation: z.enum(['Portrait', 'Landscape']).optional().describe('PDF orientation')
    })
  )
  .output(
    z.object({
      viewId: z.string(),
      format: z.enum(['csv', 'image', 'pdf']),
      contentType: z.string(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.format !== 'image' && ctx.input.imageResolution !== undefined) {
      throw tableauServiceError('imageResolution is only valid when format is "image".');
    }
    if (ctx.input.format !== 'pdf') {
      if (
        ctx.input.vizHeight !== undefined ||
        ctx.input.vizWidth !== undefined ||
        ctx.input.pdfPageType !== undefined ||
        ctx.input.pdfOrientation !== undefined
      ) {
        throw tableauServiceError(
          'vizHeight, vizWidth, pdfPageType, and pdfOrientation are only valid when format is "pdf".'
        );
      }
    }

    let client = createClient(ctx.config, ctx.auth);
    let result = await client.exportView(ctx.input.viewId, ctx.input.format, {
      maxAgeMinutes: ctx.input.maxAgeMinutes,
      filters: ctx.input.filters,
      imageResolution: ctx.input.imageResolution,
      vizHeight: ctx.input.vizHeight,
      vizWidth: ctx.input.vizWidth,
      pdfPageType: ctx.input.pdfPageType,
      pdfOrientation: ctx.input.pdfOrientation
    });

    let attachment =
      ctx.input.format === 'csv'
        ? createTextAttachment(result.data, 'text/csv')
        : createBase64Attachment(result.data, result.contentType);

    return {
      output: {
        viewId: ctx.input.viewId,
        format: ctx.input.format,
        contentType: result.contentType,
        attachmentCount: 1
      },
      attachments: [attachment],
      message: `Exported Tableau view \`${ctx.input.viewId}\` as ${ctx.input.format}.`
    };
  })
  .build();
