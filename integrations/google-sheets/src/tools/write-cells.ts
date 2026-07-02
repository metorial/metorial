import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let writeCells = SlateTool.create(spec, {
  name: 'Write Cells',
  key: 'write_cells',
  description: `Writes values to one or more ranges in a spreadsheet. Supports single-range writes, multi-range batch writes, and appending data to the end of a table. Values can be written as raw data or interpreted as user input (parsing dates, formulas, etc.).`,
  instructions: [
    'Use A1 notation for ranges, e.g., "Sheet1!A1:B2".',
    'Quote sheet names that contain spaces or special characters, e.g., "\'Draft summary\'!A1:Z80".',
    'Values are a 2D array where each inner array is a row.',
    'Set valueInputOption to "USER_ENTERED" to have values parsed as if typed in the UI (formulas, dates, etc.) or "RAW" for literal values.',
    'Use "append" mode to add rows to the end of a table detected at the given range.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.writeCells)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      range: z
        .string()
        .optional()
        .describe(
          'Target range in A1 notation for a single write or append (e.g., "Sheet1!A1:B2" or "\'Draft summary\'!A1:Z80")'
        ),
      values: z
        .array(z.array(z.any()))
        .optional()
        .describe('2D array of values to write (each inner array is a row)'),
      rangeValues: z
        .array(
          z.object({
            range: z
              .string()
              .describe(
                'Target range in A1 notation. Quote sheet names with spaces or special characters.'
              ),
            values: z.array(z.array(z.any())).describe('2D array of values for this range')
          })
        )
        .optional()
        .describe('Multiple ranges to write at once (batch update)'),
      valueInputOption: z
        .enum(['RAW', 'USER_ENTERED'])
        .optional()
        .describe(
          'How to interpret input values. USER_ENTERED parses formulas and dates. Defaults to USER_ENTERED.'
        ),
      append: z
        .boolean()
        .optional()
        .describe(
          'If true, appends values after the last row of the table found at the given range'
        ),
      insertDataOption: z
        .enum(['OVERWRITE', 'INSERT_ROWS'])
        .optional()
        .describe(
          'When appending, whether to overwrite existing data or insert new rows. Defaults to INSERT_ROWS.'
        )
    })
  )
  .output(
    z.object({
      updatedRange: z.string().optional().describe('Range that was updated (single write)'),
      updatedRows: z.number().optional().describe('Number of rows updated'),
      updatedColumns: z.number().optional().describe('Number of columns updated'),
      updatedCells: z.number().optional().describe('Total cells updated'),
      totalUpdatedCells: z
        .number()
        .optional()
        .describe('Total cells updated across all ranges (batch)'),
      totalUpdatedRows: z
        .number()
        .optional()
        .describe('Total rows updated across all ranges (batch)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);

    let valueInputOption = ctx.input.valueInputOption ?? 'USER_ENTERED';

    // Batch write to multiple ranges
    if (ctx.input.rangeValues && ctx.input.rangeValues.length > 0) {
      let result = await client.batchUpdateValues(
        ctx.input.spreadsheetId,
        ctx.input.rangeValues,
        { valueInputOption }
      );

      return {
        output: {
          totalUpdatedCells: result.totalUpdatedCells,
          totalUpdatedRows: result.totalUpdatedRows
        },
        message: `Batch updated ${result.totalUpdatedCells ?? 0} cell(s) across ${ctx.input.rangeValues.length} range(s).`
      };
    }

    let range = ctx.input.range;
    let values = ctx.input.values;

    if (!range || !values) {
      throw createApiServiceError(
        'Either "range" and "values" must be provided, or "rangeValues" for batch writes'
      );
    }

    // Append mode
    if (ctx.input.append) {
      let result = await client.appendValues(ctx.input.spreadsheetId, range, values, {
        valueInputOption,
        insertDataOption: ctx.input.insertDataOption
      });

      let updates = result.updates ?? {};
      return {
        output: {
          updatedRange: updates.updatedRange,
          updatedRows: updates.updatedRows,
          updatedColumns: updates.updatedColumns,
          updatedCells: updates.updatedCells
        },
        message: `Appended ${updates.updatedRows ?? values.length} row(s) to **${updates.updatedRange ?? range}**.`
      };
    }

    // Single range write
    let result = await client.updateValues(ctx.input.spreadsheetId, range, values, {
      valueInputOption
    });

    return {
      output: {
        updatedRange: result.updatedRange,
        updatedRows: result.updatedRows,
        updatedColumns: result.updatedColumns,
        updatedCells: result.updatedCells
      },
      message: `Updated ${result.updatedCells ?? 0} cell(s) in **${result.updatedRange ?? range}**.`
    };
  })
  .build();
