import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { addViewExportFile, createClient, EXPORT_FORMAT_LABELS } from '../lib/helpers';
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
  description: `Export a Tableau view as a downloadable CSV data, PNG image, or PDF file. Supports Tableau view filter query parameters and cache max-age controls.`,
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
    let view = await client.getView(ctx.input.viewId);
    let file = client.viewExportFile(ctx.input.viewId, ctx.input.format, {
      maxAgeMinutes: ctx.input.maxAgeMinutes,
      filters: ctx.input.filters,
      imageResolution: ctx.input.imageResolution,
      vizHeight: ctx.input.vizHeight,
      vizWidth: ctx.input.vizWidth,
      pdfPageType: ctx.input.pdfPageType,
      pdfOrientation: ctx.input.pdfOrientation
    });
    await addViewExportFile(ctx, file);

    let label = view?.name ? `**${view.name}**` : `\`${ctx.input.viewId}\``;
    return {
      output: {
        viewId: ctx.input.viewId,
        format: ctx.input.format,
        contentType: file.mimeType,
        attachmentCount: 1
      },
      message: `Prepared view ${label} as a ${EXPORT_FORMAT_LABELS[ctx.input.format]} for download.`
    };
  })
  .build();
