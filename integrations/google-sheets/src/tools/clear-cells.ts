import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let clearCells = SlateTool.create(spec, {
  name: 'Clear Cells',
  key: 'clear_cells',
  description: `Clears all values from a specified range in a spreadsheet while preserving formatting. Use this to remove cell contents without deleting the cells themselves.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.clearCells)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      range: z.string().describe('Range to clear in A1 notation (e.g., "Sheet1!A1:D10")')
    })
  )
  .output(
    z.object({
      clearedRange: z.string().describe('The range that was cleared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let result = await client.clearValues(ctx.input.spreadsheetId, ctx.input.range);

    return {
      output: {
        clearedRange: result.clearedRange ?? ctx.input.range
      },
      message: `Cleared values from range **${result.clearedRange ?? ctx.input.range}**.`
    };
  })
  .build();
