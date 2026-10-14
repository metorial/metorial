import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

// Keep the inline CSV well under the tool response limit; larger results are cut at a
// row boundary and the full file stays available through Export View.
let MAX_INLINE_CSV_BYTES = 4 * 1024 * 1024;
let MAX_VIEW_DATA_DOWNLOAD_BYTES = 32 * 1024 * 1024;

let filterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

let jsonStringBytes = (text: string) => Buffer.byteLength(JSON.stringify(text), 'utf8') - 2;

let truncateCsvAtRow = (csv: string, maxBytes: number) => {
  let kept: string[] = [];
  let used = 0;
  for (let line of csv.split('\n')) {
    let lineBytes = jsonStringBytes(line) + 2;
    if (kept.length > 0 && used + lineBytes > maxBytes) break;
    kept.push(line);
    used += lineBytes;
  }
  return { csv: kept.join('\n'), rows: kept.length };
};

let isDownloadTooLarge = (error: unknown) =>
  /maxContentLength/i.test(String((error as { message?: unknown } | null)?.message ?? ''));

export let getViewData = SlateTool.create(spec, {
  name: 'Get View Data',
  key: 'get_view_data',
  description: `Get the underlying data of a Tableau view as CSV text. Useful for reading the tabular data behind a dashboard visualization. Use **Export View** with format "csv" to get the data as a downloadable file instead.`,
  instructions: [
    'Large results are cut at a row boundary and marked as truncated; narrow them with filters or use Export View for the full file.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      viewId: z.string().describe('LUID of the view to read data from'),
      filters: z
        .record(z.string(), filterValueSchema)
        .optional()
        .describe('View filters keyed by field name; sent as vf_<field>=value'),
      maxAgeMinutes: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum age in minutes of cached data Tableau may return')
    })
  )
  .output(
    z.object({
      viewId: z.string(),
      contentType: z.literal('text/csv'),
      csvData: z.string().describe('CSV content of the view data'),
      byteSize: z.number().int().nonnegative().describe('Size of the full CSV data in bytes'),
      truncated: z
        .boolean()
        .optional()
        .describe('True when csvData holds only the first rows of a larger result')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let csv: string;
    try {
      csv = await client.getViewData(
        ctx.input.viewId,
        { filters: ctx.input.filters, maxAgeMinutes: ctx.input.maxAgeMinutes },
        MAX_VIEW_DATA_DOWNLOAD_BYTES
      );
    } catch (error) {
      if (isDownloadTooLarge(error)) {
        throw tableauServiceError(
          `The data for view \`${ctx.input.viewId}\` is too large to read directly. Narrow it with filters, or use Export View with format "csv" to get it as a downloadable file.`
        );
      }
      throw error;
    }

    let byteSize = Buffer.byteLength(csv, 'utf8');
    let truncated = jsonStringBytes(csv) > MAX_INLINE_CSV_BYTES;
    let returned = truncated ? truncateCsvAtRow(csv, MAX_INLINE_CSV_BYTES) : undefined;

    return {
      output: {
        viewId: ctx.input.viewId,
        contentType: 'text/csv' as const,
        csvData: returned ? returned.csv : csv,
        byteSize,
        ...(truncated ? { truncated: true } : {})
      },
      message: returned
        ? `Returned the first ${returned.rows} CSV lines of view \`${ctx.input.viewId}\` (${byteSize} bytes in total). Narrow the data with filters, or use Export View with format "csv" for the full file.`
        : `Retrieved CSV data from view \`${ctx.input.viewId}\`.`
    };
  })
  .build();
