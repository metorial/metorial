import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let writeValuesTool = SlateTool.create(spec, {
  name: 'Write Values',
  key: 'write_values',
  description: `Writes cell values to a Google Sheets spreadsheet.
Supports writing to a single range or multiple ranges in one request. Values can be entered as raw strings or parsed (formulas, dates, etc.).`,
  instructions: [
    'Use A1 notation for ranges (e.g., "Sheet1!A1:B10")',
    'Values should be a 2D array matching the range dimensions',
    'Use USER_ENTERED to have Google Sheets parse formulas and dates',
    'Use RAW to insert values exactly as provided'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      updates: z
        .array(
          z.object({
            range: z
              .string()
              .describe('Range to write in A1 notation (e.g., "Sheet1!A1:B10")'),
            values: z
              .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
              .describe('2D array of values to write')
          })
        )
        .describe('List of ranges and values to write'),
      valueInputOption: z
        .enum(['RAW', 'USER_ENTERED'])
        .optional()
        .describe(
          'How input values should be interpreted: RAW (as-is) or USER_ENTERED (parse formulas/dates)'
        )
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().optional().describe('ID of the spreadsheet'),
      totalUpdatedRows: z.number().optional().describe('Total rows updated'),
      totalUpdatedColumns: z.number().optional().describe('Total columns updated'),
      totalUpdatedCells: z.number().optional().describe('Total cells updated'),
      totalUpdatedSheets: z.number().optional().describe('Total sheets updated'),
      responses: z
        .array(
          z.object({
            updatedRange: z.string().optional().describe('The range that was updated'),
            updatedRows: z.number().optional().describe('Rows updated in this range'),
            updatedColumns: z.number().optional().describe('Columns updated in this range'),
            updatedCells: z.number().optional().describe('Cells updated in this range')
          })
        )
        .optional()
        .describe('Update results for each range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.batchUpdateValues(ctx.input.spreadsheetId, ctx.input.updates, {
      valueInputOption: ctx.input.valueInputOption || 'USER_ENTERED'
    });

    let output = {
      spreadsheetId: result.spreadsheetId,
      totalUpdatedRows: result.totalUpdatedRows,
      totalUpdatedColumns: result.totalUpdatedColumns,
      totalUpdatedCells: result.totalUpdatedCells,
      totalUpdatedSheets: result.totalUpdatedSheets,
      responses: result.responses?.map(r => ({
        updatedRange: r.updatedRange,
        updatedRows: r.updatedRows,
        updatedColumns: r.updatedColumns,
        updatedCells: r.updatedCells
      }))
    };

    return {
      output,
      message: `Updated **${output.totalUpdatedCells || 0}** cells across **${ctx.input.updates.length}** range(s).`
    };
  })
  .build();
