import { createBase64Attachment, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { apifyValidationError } from '../lib/errors';
import { spec } from '../spec';
import { jsonObjectSchema } from './shared';

let datasetFormatSchema = z.enum(['json', 'csv', 'xlsx', 'xml', 'rss', 'html']);

let mimeTypeForFormat = (format: string, fallback: string) => {
  if (fallback && fallback !== 'application/octet-stream') return fallback;
  if (format === 'csv') return 'text/csv';
  if (format === 'xlsx')
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (format === 'xml') return 'application/xml';
  if (format === 'rss') return 'application/rss+xml';
  if (format === 'html') return 'text/html';
  return 'application/json';
};

let isTextFormat = (format: string) => ['csv', 'xml', 'rss', 'html'].includes(format);

export let getDatasetItems = SlateTool.create(spec, {
  name: 'Get Dataset Items',
  key: 'get_dataset_items',
  description: `Retrieve or export items from an Apify dataset. JSON items are returned inline; CSV, XLSX, XML, RSS, and HTML exports are returned as Slate attachments.`,
  instructions: [
    'Provide either datasetId or runId. Use runId to read the run default dataset.',
    'Use outputFormat=json for inline structured records.',
    'Use CSV/XLSX/XML/RSS/HTML when the user asks for a file export.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().optional().describe('Dataset ID; provide this or runId'),
      runId: z.string().optional().describe('Actor run ID; alternative to datasetId'),
      outputFormat: datasetFormatSchema.optional().default('json'),
      limit: z.number().int().positive().optional().default(100),
      offset: z.number().int().min(0).optional().default(0),
      fields: z.array(z.string()).optional().describe('Only include these fields'),
      omit: z.array(z.string()).optional().describe('Exclude these fields'),
      unwind: z.array(z.string()).optional().describe('Object fields to unwind'),
      flatten: z.array(z.string()).optional().describe('Object fields to flatten'),
      descending: z.boolean().optional().default(false),
      clean: z.boolean().optional().default(false),
      skipHeaderRow: z.boolean().optional().describe('Skip CSV/XLSX header row'),
      skipHidden: z.boolean().optional().describe('Skip hidden fields')
    })
  )
  .output(
    z.object({
      items: z.array(jsonObjectSchema).optional().describe('JSON dataset items'),
      itemCount: z.number().optional().describe('Number of JSON items returned'),
      outputFormat: datasetFormatSchema,
      mimeType: z.string().optional().describe('Export attachment MIME type'),
      byteLength: z.number().optional().describe('Export attachment byte length'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let common = {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: ctx.input.fields,
      omit: ctx.input.omit,
      unwind: ctx.input.unwind,
      flatten: ctx.input.flatten,
      desc: ctx.input.descending,
      clean: ctx.input.clean,
      skipHeaderRow: ctx.input.skipHeaderRow,
      skipHidden: ctx.input.skipHidden
    };

    if (ctx.input.runId && ctx.input.datasetId) {
      throw apifyValidationError('Provide either datasetId or runId, not both.');
    }

    if (ctx.input.outputFormat === 'json') {
      let items: Record<string, any>[];
      if (ctx.input.runId) {
        items = await client.getRunDatasetItems(ctx.input.runId, common);
      } else if (ctx.input.datasetId) {
        items = await client.getDatasetItems(ctx.input.datasetId, common);
      } else {
        throw apifyValidationError('Either datasetId or runId must be provided.');
      }

      return {
        output: {
          items,
          itemCount: items.length,
          outputFormat: 'json' as const
        },
        message: `Retrieved **${items.length}** JSON dataset item(s).`
      };
    }

    if (!ctx.input.datasetId) {
      throw apifyValidationError(
        'datasetId is required for non-JSON dataset exports. Fetch the run first to get defaultDatasetId.'
      );
    }

    let exported = await client.exportDatasetItems(ctx.input.datasetId, {
      ...common,
      format: ctx.input.outputFormat
    });
    let mimeType = mimeTypeForFormat(ctx.input.outputFormat, exported.contentType);
    let attachment = isTextFormat(ctx.input.outputFormat)
      ? createTextAttachment(exported.contentText ?? '', mimeType)
      : createBase64Attachment(exported.contentBase64, mimeType);

    return {
      output: {
        outputFormat: ctx.input.outputFormat,
        mimeType,
        byteLength: exported.byteLength,
        attachmentCount: 1
      },
      attachments: [attachment],
      message: `Exported dataset \`${ctx.input.datasetId}\` as **${ctx.input.outputFormat}** attachment.`
    };
  })
  .build();
