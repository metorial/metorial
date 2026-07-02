import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let clearValuesTool = SlateTool.create(spec, {
  name: 'Clear Values',
  key: 'clear_values',
  description: `Clears cell values from specified ranges in a Google Sheets spreadsheet.
Removes values but preserves formatting, data validation, and other cell properties.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      ranges: z
        .array(z.string())
        .describe('Ranges to clear in A1 notation (e.g., ["Sheet1!A1:B10", "Sheet2!C1:D5"])')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().optional().describe('ID of the spreadsheet'),
      clearedRanges: z.array(z.string()).optional().describe('Ranges that were cleared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.batchClearValues(ctx.input.spreadsheetId, ctx.input.ranges);

    let output = {
      spreadsheetId: result.spreadsheetId,
      clearedRanges: result.clearedRanges
    };

    return {
      output,
      message: `Cleared **${ctx.input.ranges.length}** range(s): ${ctx.input.ranges.map(r => `\`${r}\``).join(', ')}.`
    };
  })
  .build();
