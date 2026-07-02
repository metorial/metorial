import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let appendValuesTool = SlateTool.create(spec, {
  name: 'Append Values',
  key: 'append_values',
  description: `Appends rows of data to a table in a Google Sheets spreadsheet.
Finds the last row with data in the specified range and appends new rows below it. Ideal for adding records to a data table.`,
  instructions: [
    'Specify a range that covers the table (e.g., "Sheet1!A:E" for columns A through E)',
    'New rows will be appended after the last row with data'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      range: z.string().describe('Range defining the table to append to (e.g., "Sheet1!A:E")'),
      values: z
        .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
        .describe('2D array of rows to append'),
      valueInputOption: z
        .enum(['RAW', 'USER_ENTERED'])
        .optional()
        .describe('How input values should be interpreted'),
      insertDataOption: z
        .enum(['OVERWRITE', 'INSERT_ROWS'])
        .optional()
        .describe('Whether to overwrite or insert new rows')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().optional().describe('ID of the spreadsheet'),
      tableRange: z.string().optional().describe('Range of the table that was appended to'),
      updatedRange: z.string().optional().describe('The actual range that was written'),
      updatedRows: z.number().optional().describe('Number of rows appended'),
      updatedColumns: z.number().optional().describe('Number of columns in appended rows'),
      updatedCells: z.number().optional().describe('Total cells written')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    let result = await client.appendValues(
      ctx.input.spreadsheetId,
      ctx.input.range,
      ctx.input.values,
      {
        valueInputOption: ctx.input.valueInputOption || 'USER_ENTERED',
        insertDataOption: ctx.input.insertDataOption
      }
    );

    let output = {
      spreadsheetId: result.spreadsheetId,
      tableRange: result.tableRange,
      updatedRange: result.updates?.updatedRange,
      updatedRows: result.updates?.updatedRows,
      updatedColumns: result.updates?.updatedColumns,
      updatedCells: result.updates?.updatedCells
    };

    return {
      output,
      message: `Appended **${output.updatedRows || ctx.input.values.length}** row(s) to range \`${ctx.input.range}\`.`
    };
  })
  .build();
