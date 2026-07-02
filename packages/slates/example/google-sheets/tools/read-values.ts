import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let readValuesTool = SlateTool.create(spec, {
  name: 'Read Values',
  key: 'read_values',
  description: `Reads cell values from a Google Sheets spreadsheet.
Supports reading a single range or multiple ranges in one request. Values can be returned as formatted strings, raw values, or formulas.`,
  instructions: [
    'Use A1 notation for ranges (e.g., "Sheet1!A1:B10", "A1:C5")',
    'Omit sheet name to read from the first sheet'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      ranges: z
        .array(z.string())
        .describe('Ranges to read in A1 notation (e.g., ["Sheet1!A1:B10", "Sheet2!C1:D5"])'),
      valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .optional()
        .describe(
          'How values should be rendered: FORMATTED_VALUE (display value), UNFORMATTED_VALUE (raw value), or FORMULA'
        ),
      dateTimeRenderOption: z
        .enum(['SERIAL_NUMBER', 'FORMATTED_STRING'])
        .optional()
        .describe('How dates should be rendered'),
      majorDimension: z
        .enum(['ROWS', 'COLUMNS'])
        .optional()
        .describe('Whether to return data row-by-row or column-by-column')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      valueRanges: z
        .array(
          z.object({
            range: z.string().optional().describe('The range that was read'),
            majorDimension: z
              .enum(['ROWS', 'COLUMNS'])
              .optional()
              .describe('How the data is organized'),
            values: z
              .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
              .optional()
              .describe('2D array of cell values')
          })
        )
        .describe('Values for each requested range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.batchGetValues(ctx.input.spreadsheetId, ctx.input.ranges, {
      valueRenderOption: ctx.input.valueRenderOption,
      dateTimeRenderOption: ctx.input.dateTimeRenderOption,
      majorDimension: ctx.input.majorDimension
    });

    let totalCells = 0;
    for (let vr of result.valueRanges || []) {
      if (vr.values) {
        for (let row of vr.values) {
          totalCells += row.length;
        }
      }
    }

    let output = {
      spreadsheetId: result.spreadsheetId || ctx.input.spreadsheetId,
      valueRanges: (result.valueRanges || []).map(vr => ({
        range: vr.range,
        majorDimension: vr.majorDimension,
        values: vr.values
      }))
    };

    return {
      output,
      message: `Read **${totalCells}** cells from **${ctx.input.ranges.length}** range(s).`
    };
  })
  .build();
