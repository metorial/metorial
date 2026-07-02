import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let mergeCells = SlateTool.create(spec, {
  name: 'Merge Cells',
  key: 'merge_cells',
  description: `Merge or unmerge a range of cells in a spreadsheet. Supports merging all cells into one, merging by rows, or merging by columns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.mergeCells)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      action: z.enum(['merge', 'unmerge']).describe('Whether to merge or unmerge cells'),
      sheetId: z.number().describe('Numeric ID of the sheet'),
      startRowIndex: z.number().describe('Start row index (0-based, inclusive)'),
      endRowIndex: z.number().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z.number().describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().describe('End column index (0-based, exclusive)'),
      mergeType: z
        .enum(['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'])
        .optional()
        .describe(
          'Merge strategy. MERGE_ALL merges all cells, MERGE_COLUMNS merges cells per column, MERGE_ROWS merges cells per row. Defaults to MERGE_ALL.'
        )
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      action: z.string().describe('The action performed'),
      mergedRange: z.string().describe('Description of the affected range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    let range = {
      sheetId: input.sheetId,
      startRowIndex: input.startRowIndex,
      endRowIndex: input.endRowIndex,
      startColumnIndex: input.startColumnIndex,
      endColumnIndex: input.endColumnIndex
    };

    let request: Record<string, any>;

    if (input.action === 'merge') {
      request = {
        mergeCells: {
          range,
          mergeType: input.mergeType ?? 'MERGE_ALL'
        }
      };
    } else {
      request = {
        unmergeCells: { range }
      };
    }

    await client.batchUpdate(input.spreadsheetId, [request]);

    let rangeDesc = `Sheet ${input.sheetId} [${input.startRowIndex}:${input.endRowIndex}, ${input.startColumnIndex}:${input.endColumnIndex}]`;

    return {
      output: {
        spreadsheetId: input.spreadsheetId,
        action: input.action,
        mergedRange: rangeDesc
      },
      message: `${input.action === 'merge' ? 'Merged' : 'Unmerged'} cells in ${rangeDesc}.`
    };
  })
  .build();
