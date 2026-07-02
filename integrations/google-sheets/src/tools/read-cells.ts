import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let readCells = SlateTool.create(spec, {
  name: 'Read Cells',
  key: 'read_cells',
  description: `Reads values from one or more ranges in a spreadsheet. Supports A1 notation (e.g., "Sheet1!A1:B10") and named ranges. Can read a single range or multiple ranges at once. Returns values as formatted strings, raw values, or formulas.`,
  instructions: [
    'Use A1 notation to specify ranges, e.g., "Sheet1!A1:D10", "A1:B5", "Sheet1!A:A" for an entire column.',
    'For multiple ranges, pass an array to the "ranges" field instead of using "range".'
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
        .describe('Single range in A1 notation (e.g., "Sheet1!A1:B10")'),
      ranges: z.array(z.string()).optional().describe('Multiple ranges to read at once'),
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
      valueRanges: z
        .array(
          z.object({
            range: z.string().describe('The range that was read'),
            values: z.array(z.array(z.any())).optional().describe('2D array of cell values')
          })
        )
        .optional()
        .describe('Array of range results (for multi-range reads)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);

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
      let valueRanges = (result.valueRanges ?? []).map((vr: any) => ({
        range: vr.range,
        values: vr.values
      }));

      let totalCells = valueRanges.reduce((sum: number, vr: any) => {
        return sum + (vr.values?.reduce((s: number, row: any[]) => s + row.length, 0) ?? 0);
      }, 0);

      return {
        output: { valueRanges },
        message: `Read ${valueRanges.length} range(s) containing ${totalCells} cell(s) total.`
      };
    }

    let range = ctx.input.range;
    if (!range) {
      throw new Error('Either "range" or "ranges" must be provided');
    }

    let result = await client.getValues(ctx.input.spreadsheetId, range, options);
    let values = result.values ?? [];
    let totalCells = values.reduce((sum: number, row: any[]) => sum + row.length, 0);

    return {
      output: {
        range: result.range,
        values
      },
      message: `Read ${totalCells} cell(s) from range **${result.range}** (${values.length} rows).`
    };
  })
  .build();
