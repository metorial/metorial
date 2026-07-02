import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageProtectedRanges = SlateTool.create(spec, {
  name: 'Manage Protected Ranges',
  key: 'manage_protected_ranges',
  description: `Add or remove protection on cell ranges to prevent modifications. Optionally specify which users can still edit the protected range. Can protect an entire sheet or a specific range within a sheet.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.manageProtectedRanges)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet'),
      action: z.enum(['add', 'delete']).describe('Whether to add or remove protection'),
      protectedRangeId: z
        .number()
        .optional()
        .describe('ID of the protected range to delete (required for delete)'),
      sheetId: z.number().optional().describe('Sheet ID to protect (required for add)'),
      startRowIndex: z
        .number()
        .optional()
        .describe(
          'Start row index of the range to protect (0-based, inclusive). Omit to protect entire sheet.'
        ),
      endRowIndex: z.number().optional().describe('End row index (0-based, exclusive)'),
      startColumnIndex: z
        .number()
        .optional()
        .describe('Start column index (0-based, inclusive)'),
      endColumnIndex: z.number().optional().describe('End column index (0-based, exclusive)'),
      description: z.string().optional().describe('Description of the protected range'),
      warningOnly: z
        .boolean()
        .optional()
        .describe('If true, show a warning instead of preventing edits. Defaults to false.'),
      editors: z
        .array(z.string())
        .optional()
        .describe('Email addresses of users who can edit the protected range')
    })
  )
  .output(
    z.object({
      protectedRangeId: z.number().optional().describe('ID of the protected range'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient(ctx.auth.token);
    let input = ctx.input;

    if (input.action === 'add') {
      if (input.sheetId === undefined)
        throw new Error('sheetId is required for adding protection');

      let range: Record<string, any> = { sheetId: input.sheetId };
      if (input.startRowIndex !== undefined) range.startRowIndex = input.startRowIndex;
      if (input.endRowIndex !== undefined) range.endRowIndex = input.endRowIndex;
      if (input.startColumnIndex !== undefined)
        range.startColumnIndex = input.startColumnIndex;
      if (input.endColumnIndex !== undefined) range.endColumnIndex = input.endColumnIndex;

      let protectedRange: Record<string, any> = {
        range,
        description: input.description,
        warningOnly: input.warningOnly ?? false
      };

      if (input.editors && input.editors.length > 0) {
        protectedRange.editors = { users: input.editors };
      }

      let result = await client.batchUpdate(input.spreadsheetId, [
        { addProtectedRange: { protectedRange } }
      ]);

      let rangeId = result.replies?.[0]?.addProtectedRange?.protectedRange?.protectedRangeId;

      return {
        output: {
          protectedRangeId: rangeId,
          action: 'add'
        },
        message: `Added protection (ID: ${rangeId}) on sheet ${input.sheetId}${input.warningOnly ? ' (warning only)' : ''}.`
      };
    }

    if (input.action === 'delete') {
      if (input.protectedRangeId === undefined)
        throw new Error('protectedRangeId is required for deleting protection');

      await client.batchUpdate(input.spreadsheetId, [
        { deleteProtectedRange: { protectedRangeId: input.protectedRangeId } }
      ]);

      return {
        output: {
          protectedRangeId: input.protectedRangeId,
          action: 'delete'
        },
        message: `Removed protection ID ${input.protectedRangeId}.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
