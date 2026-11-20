import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getRemainingA1Range } from '../lib/a1-range';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

let MAX_OUTPUT_BYTES = 2_000_000;

type MajorDimension = 'ROWS' | 'COLUMNS';

let fitValueRange = (
  valueRange: { range: string; values?: unknown[][] },
  budgetBytes: number,
  majorDimension: MajorDimension
) => {
  let values = valueRange.values ?? [];
  let usedBytes = 0;
  let kept = 0;

  for (let line of values) {
    let size = Buffer.byteLength(JSON.stringify(line) ?? '', 'utf8') + 1;
    if (usedBytes + size > budgetBytes) {
      if (kept === 0 && size > MAX_OUTPUT_BYTES) {
        let dimension = majorDimension === 'COLUMNS' ? 'column' : 'row';
        throw createApiServiceError(
          `A single ${dimension} of ${valueRange.range} holds more data than fits in one response. Read fewer ${majorDimension === 'COLUMNS' ? 'rows' : 'columns'} at a time.`,
          { reason: 'google_sheets_line_too_large' }
        );
      }
      break;
    }
    usedBytes += size;
    kept += 1;
  }

  if (kept === values.length) {
    return {
      range: valueRange.range,
      values: valueRange.values,
      usedBytes,
      totalLines: values.length
    };
  }

  return {
    range: valueRange.range,
    values: values.slice(0, kept),
    usedBytes,
    totalLines: values.length,
    truncated: true as const,
    nextRange: getRemainingA1Range(valueRange.range, kept, majorDimension)
  };
};

let continuationHint = (
  dimension: string,
  ranges: { range: string; values?: unknown[][]; totalLines: number; nextRange?: string }[]
) =>
  ranges
    .map(range => {
      let returned = range.values?.length ?? 0;
      let next = range.nextRange
        ? ` Continue with range **${range.nextRange}**.`
        : ` Read a smaller part of ${range.range} to see the rest.`;
      return ` Only the first ${returned} of ${range.totalLines} ${dimension} of ${range.range} fit in one response.${next}`;
    })
    .join('');

export let readCells = SlateTool.create(spec, {
  name: 'Read Cells',
  key: 'read_cells',
  description: `Reads values from one or more ranges in a spreadsheet. Supports A1 notation (e.g., "Sheet1!A1:B10") and named ranges. Can read a single range or multiple ranges at once. Returns values as formatted strings, raw values, or formulas.`,
  instructions: [
    'Use A1 notation to specify ranges, e.g., "Sheet1!A1:D10", "A1:B5", "Sheet1!A:A" for an entire column.',
    'Quote sheet names that contain spaces or special characters, e.g., "\'Draft summary\'!A1:Z80".',
    'For multiple ranges, pass an array to the "ranges" field instead of using "range".',
    'Large reads return only the leading rows (or columns) that fit in one response and are marked truncated; read the rest by passing nextRange as the range.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleSheetsActionScopes.readCells)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      range: z
        .string()
        .optional()
        .describe(
          'Single range in A1 notation (e.g., "Sheet1!A1:B10" or "\'Draft summary\'!A1:Z80")'
        ),
      ranges: z
        .array(z.string())
        .optional()
        .describe(
          'Multiple ranges to read at once. Quote sheet names with spaces or special characters.'
        ),
      valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .optional()
        .describe(
          'How values should be rendered. FORMATTED_VALUE returns display values, UNFORMATTED_VALUE returns raw values, FORMULA returns formulas.'
        ),
      majorDimension: z
        .enum(['ROWS', 'COLUMNS'])
        .optional()
        .describe('Whether to return data row-wise or column-wise. Defaults to ROWS.'),
      dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .describe('How dates/times should be rendered')
    })
  )
  .output(
    z.object({
      range: z
        .string()
        .optional()
        .describe('The range that was read (for single range reads)'),
      values: z
        .array(z.array(z.any()))
        .optional()
        .describe('2D array of cell values (for single range reads)'),
      nextRange: z
        .string()
        .optional()
        .describe(
          'Range holding the cells that did not fit in this response (for single range reads); read it next to continue'
        ),
      valueRanges: z
        .array(
          z.object({
            range: z.string().describe('The range that was read'),
            values: z.array(z.array(z.any())).optional().describe('2D array of cell values'),
            truncated: z
              .boolean()
              .optional()
              .describe('True when only the leading part of this range was returned'),
            nextRange: z
              .string()
              .optional()
              .describe(
                'Range holding the cells of this range that did not fit in this response'
              )
          })
        )
        .optional()
        .describe('Array of range results (for multi-range reads)'),
      truncated: z
        .boolean()
        .optional()
        .describe(
          'True when the data was too large for one response and only its leading part was returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);

    let majorDimension: MajorDimension = ctx.input.majorDimension ?? 'ROWS';
    let dimension = majorDimension === 'COLUMNS' ? 'columns' : 'rows';

    let options = {
      valueRenderOption: ctx.input.valueRenderOption,
      majorDimension: ctx.input.majorDimension,
      dateTimeRenderOption: ctx.input.dateTimeRenderOption
    };

    if (ctx.input.ranges && ctx.input.ranges.length > 0) {
      let result = await client.batchGetValues(
        ctx.input.spreadsheetId,
        ctx.input.ranges,
        options
      );
      let remainingBytes = MAX_OUTPUT_BYTES;
      let responseRanges: { range: string; values?: unknown[][] }[] = result.valueRanges ?? [];
      let fitted = responseRanges.map(vr => {
        let fit = fitValueRange(vr, remainingBytes, majorDimension);
        remainingBytes -= fit.usedBytes;
        return fit;
      });
      let truncatedRanges = fitted.filter(vr => vr.truncated);
      let valueRanges = fitted.map(vr => ({
        range: vr.range,
        values: vr.values,
        truncated: vr.truncated,
        nextRange: vr.nextRange
      }));

      let totalCells = valueRanges.reduce((sum: number, vr: any) => {
        return sum + (vr.values?.reduce((s: number, row: any[]) => s + row.length, 0) ?? 0);
      }, 0);

      return {
        output: { valueRanges, truncated: truncatedRanges.length > 0 || undefined },
        message: `Read ${valueRanges.length} range(s) containing ${totalCells} cell(s) total.${continuationHint(dimension, truncatedRanges)}`
      };
    }

    let range = ctx.input.range;
    if (!range) {
      throw createApiServiceError('Either "range" or "ranges" must be provided');
    }

    let result = await client.getValues(ctx.input.spreadsheetId, range, options);
    let fitted = fitValueRange(
      { range: result.range, values: result.values ?? [] },
      MAX_OUTPUT_BYTES,
      majorDimension
    );
    let values = fitted.values ?? [];
    let totalCells = values.reduce((sum: number, row: unknown[]) => sum + row.length, 0);

    return {
      output: {
        range: result.range,
        values,
        nextRange: fitted.nextRange,
        truncated: fitted.truncated
      },
      message: `Read ${totalCells} cell(s) from range **${result.range}** (${values.length} ${dimension}).${
        fitted.truncated ? continuationHint(dimension, [fitted]) : ''
      }`
    };
  })
  .build();
