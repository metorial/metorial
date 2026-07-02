import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let namedRangesTool = SlateTool.create(spec, {
  name: 'Manage Named Ranges',
  key: 'manage_named_ranges',
  description: `Creates or deletes named ranges in a Google Sheets spreadsheet.
Named ranges allow you to reference a cell range by name instead of A1 notation, making formulas more readable.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      operation: z.enum(['create', 'delete']).describe('Operation to perform'),
      name: z.string().optional().describe('Name for the range (required for create)'),
      namedRangeId: z.string().optional().describe('ID of the named range to delete'),
      sheetId: z
        .number()
        .optional()
        .describe('Sheet ID containing the range (required for create)'),
      startRowIndex: z.number().optional().describe('Start row index (0-based)'),
      endRowIndex: z.number().optional().describe('End row index (exclusive)'),
      startColumnIndex: z.number().optional().describe('Start column index (0-based)'),
      endColumnIndex: z.number().optional().describe('End column index (exclusive)')
    })
  )
  .output(
    z.object({
      namedRangeId: z.string().optional().describe('ID of the named range'),
      name: z.string().optional().describe('Name of the range'),
      operationPerformed: z.string().describe('Description of the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    if (ctx.input.operation === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for create operation');
      }
      if (ctx.input.sheetId === undefined) {
        throw new Error('sheetId is required for create operation');
      }

      let namedRangeId = await client.addNamedRange(ctx.input.spreadsheetId, ctx.input.name, {
        sheetId: ctx.input.sheetId,
        startRowIndex: ctx.input.startRowIndex,
        endRowIndex: ctx.input.endRowIndex,
        startColumnIndex: ctx.input.startColumnIndex,
        endColumnIndex: ctx.input.endColumnIndex
      });

      return {
        output: {
          namedRangeId,
          name: ctx.input.name,
          operationPerformed: `Created named range "${ctx.input.name}"`
        },
        message: `Created named range **"${ctx.input.name}"** with ID \`${namedRangeId}\`.`
      };
    } else {
      if (!ctx.input.namedRangeId) {
        throw new Error('namedRangeId is required for delete operation');
      }

      await client.deleteNamedRange(ctx.input.spreadsheetId, ctx.input.namedRangeId);

      return {
        output: {
          namedRangeId: ctx.input.namedRangeId,
          operationPerformed: 'Deleted named range'
        },
        message: `Deleted named range with ID \`${ctx.input.namedRangeId}\`.`
      };
    }
  })
  .build();
