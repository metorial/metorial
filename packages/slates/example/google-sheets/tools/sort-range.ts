import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let sortRangeTool = SlateTool.create(spec, {
  name: 'Sort Range',
  key: 'sort_range',
  description: `Sorts a range of data in a Google Sheets spreadsheet.
Supports multi-column sorting with ascending or descending order.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      sheetId: z.number().describe('ID of the sheet'),
      startRowIndex: z.number().describe('Start row index (0-based)'),
      endRowIndex: z.number().describe('End row index (exclusive)'),
      startColumnIndex: z.number().describe('Start column index (0-based)'),
      endColumnIndex: z.number().describe('End column index (exclusive)'),
      sortSpecs: z
        .array(
          z.object({
            columnIndex: z
              .number()
              .describe('Column index to sort by (0-based, relative to sheet)'),
            sortOrder: z
              .enum(['ASCENDING', 'DESCENDING'])
              .default('ASCENDING')
              .describe('Sort order')
          })
        )
        .describe('Sort specifications (first spec is primary sort)')
    })
  )
  .output(
    z.object({
      sorted: z.boolean().describe('Whether sorting was applied successfully'),
      range: z.string().describe('Description of the sorted range'),
      sortColumns: z.number().describe('Number of sort columns applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    await client.sortRange(
      ctx.input.spreadsheetId,
      {
        sheetId: ctx.input.sheetId,
        startRowIndex: ctx.input.startRowIndex,
        endRowIndex: ctx.input.endRowIndex,
        startColumnIndex: ctx.input.startColumnIndex,
        endColumnIndex: ctx.input.endColumnIndex
      },
      ctx.input.sortSpecs.map(s => ({
        dimensionIndex: s.columnIndex,
        sortOrder: s.sortOrder
      }))
    );

    let rowCount = ctx.input.endRowIndex - ctx.input.startRowIndex;
    let colCount = ctx.input.endColumnIndex - ctx.input.startColumnIndex;

    let output = {
      sorted: true,
      range: `${rowCount} row(s) x ${colCount} column(s)`,
      sortColumns: ctx.input.sortSpecs.length
    };

    return {
      output,
      message: `Sorted **${rowCount}** rows by ${ctx.input.sortSpecs.length} column(s).`
    };
  })
  .build();
