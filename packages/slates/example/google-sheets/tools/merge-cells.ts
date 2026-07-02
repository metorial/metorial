import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let mergeCellsTool = SlateTool.create(spec, {
  name: 'Merge Cells',
  key: 'merge_cells',
  description: `Merges or unmerges cells in a Google Sheets spreadsheet.
Supports merging all cells in a range, merging cells column by column, or row by row.`,
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
      operation: z.enum(['merge', 'unmerge']).describe('Whether to merge or unmerge cells'),
      mergeType: z
        .enum(['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'])
        .optional()
        .describe(
          'Type of merge: MERGE_ALL (single cell), MERGE_COLUMNS (merge within columns), MERGE_ROWS (merge within rows)'
        )
    })
  )
  .output(
    z.object({
      operationPerformed: z.string().describe('Description of the operation performed'),
      range: z.string().describe('Description of the affected range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let range = {
      sheetId: ctx.input.sheetId,
      startRowIndex: ctx.input.startRowIndex,
      endRowIndex: ctx.input.endRowIndex,
      startColumnIndex: ctx.input.startColumnIndex,
      endColumnIndex: ctx.input.endColumnIndex
    };

    if (ctx.input.operation === 'merge') {
      await client.mergeCells(
        ctx.input.spreadsheetId,
        range,
        ctx.input.mergeType || 'MERGE_ALL'
      );
    } else {
      await client.unmergeCells(ctx.input.spreadsheetId, range);
    }

    let rowCount = ctx.input.endRowIndex - ctx.input.startRowIndex;
    let colCount = ctx.input.endColumnIndex - ctx.input.startColumnIndex;

    let output = {
      operationPerformed:
        ctx.input.operation === 'merge'
          ? `Merged cells (${ctx.input.mergeType || 'MERGE_ALL'})`
          : 'Unmerged cells',
      range: `${rowCount} row(s) x ${colCount} column(s)`
    };

    return {
      output,
      message: `${ctx.input.operation === 'merge' ? 'Merged' : 'Unmerged'} cells in range (${rowCount} x ${colCount}).`
    };
  })
  .build();
