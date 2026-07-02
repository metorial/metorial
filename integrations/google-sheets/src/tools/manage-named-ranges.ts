import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageNamedRanges = SlateTool.create(spec, {
  name: 'Manage Named Ranges',
  key: 'manage_named_ranges',
  description: `Add, update, or delete named ranges in a spreadsheet. Named ranges assign a custom name to a cell range, making it easier to reference in formulas and API calls.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.manageNamedRanges)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      action: z.enum(['add', 'update', 'delete']).describe('Operation to perform'),
      namedRangeId: z
        .string()
        .optional()
        .describe('ID of the named range (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Name for the range (required for add, optional for update)'),
      sheetId: z
        .number()
        .optional()
        .describe('Sheet ID containing the range (required for add)'),
      startRowIndex: z.number().optional().describe('Start row index (0-based, inclusive)'),
      endRowIndex: z.number().optional().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z
        .number()
        .optional()
        .describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().optional().describe('End column index (0-based, exclusive)')
    })
  )
  .output(
    z.object({
      namedRangeId: z.string().optional().describe('ID of the named range'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    if (input.action === 'add') {
      if (!input.name) throw new Error('name is required for adding a named range');
      if (input.sheetId === undefined)
        throw new Error('sheetId is required for adding a named range');

      let range: Record<string, any> = { sheetId: input.sheetId };
      if (input.startRowIndex !== undefined) range.startRowIndex = input.startRowIndex;
      if (input.endRowIndex !== undefined) range.endRowIndex = input.endRowIndex;
      if (input.startColumnIndex !== undefined)
        range.startColumnIndex = input.startColumnIndex;
      if (input.endColumnIndex !== undefined) range.endColumnIndex = input.endColumnIndex;

      let result = await client.batchUpdate(input.spreadsheetId, [
        {
          addNamedRange: {
            namedRange: {
              name: input.name,
              range
            }
          }
        }
      ]);

      let namedRangeId = result.replies?.[0]?.addNamedRange?.namedRange?.namedRangeId;

      return {
        output: { namedRangeId, action: 'add' },
        message: `Added named range **"${input.name}"** (ID: ${namedRangeId}).`
      };
    }

    if (input.action === 'update') {
      if (!input.namedRangeId) throw new Error('namedRangeId is required for update');

      let namedRange: Record<string, any> = { namedRangeId: input.namedRangeId };
      let fields: string[] = [];

      if (input.name) {
        namedRange.name = input.name;
        fields.push('name');
      }

      if (input.sheetId !== undefined || input.startRowIndex !== undefined) {
        let range: Record<string, any> = {};
        if (input.sheetId !== undefined) range.sheetId = input.sheetId;
        if (input.startRowIndex !== undefined) range.startRowIndex = input.startRowIndex;
        if (input.endRowIndex !== undefined) range.endRowIndex = input.endRowIndex;
        if (input.startColumnIndex !== undefined)
          range.startColumnIndex = input.startColumnIndex;
        if (input.endColumnIndex !== undefined) range.endColumnIndex = input.endColumnIndex;
        namedRange.range = range;
        fields.push('range');
      }

      await client.batchUpdate(input.spreadsheetId, [
        {
          updateNamedRange: {
            namedRange,
            fields: fields.join(',')
          }
        }
      ]);

      return {
        output: { namedRangeId: input.namedRangeId, action: 'update' },
        message: `Updated named range ${input.namedRangeId}: ${fields.join(', ')}.`
      };
    }

    if (input.action === 'delete') {
      if (!input.namedRangeId) throw new Error('namedRangeId is required for delete');

      await client.batchUpdate(input.spreadsheetId, [
        { deleteNamedRange: { namedRangeId: input.namedRangeId } }
      ]);

      return {
        output: { namedRangeId: input.namedRangeId, action: 'delete' },
        message: `Deleted named range ${input.namedRangeId}.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
