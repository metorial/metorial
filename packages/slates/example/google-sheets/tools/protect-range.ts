import { SlateTool } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let protectRangeTool = SlateTool.create(spec, {
  name: 'Protect Range',
  key: 'protect_range',
  description: `Protects or unprotects a range of cells in a Google Sheets spreadsheet.
Protected ranges prevent unauthorized users from editing specified cells.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      operation: z.enum(['protect', 'unprotect']).describe('Whether to protect or unprotect'),
      sheetId: z.number().optional().describe('ID of the sheet (required for protect)'),
      startRowIndex: z.number().optional().describe('Start row index (0-based)'),
      endRowIndex: z.number().optional().describe('End row index (exclusive)'),
      startColumnIndex: z.number().optional().describe('Start column index (0-based)'),
      endColumnIndex: z.number().optional().describe('End column index (exclusive)'),
      protectedRangeId: z
        .number()
        .optional()
        .describe('ID of the protected range to remove (for unprotect)'),
      description: z.string().optional().describe('Description of why the range is protected'),
      warningOnly: z.boolean().optional().describe('Show warning instead of blocking edits'),
      editors: z
        .object({
          users: z
            .array(z.string())
            .optional()
            .describe('Email addresses of users who can edit'),
          groups: z
            .array(z.string())
            .optional()
            .describe('Email addresses of groups who can edit'),
          domainUsersCanEdit: z.boolean().optional().describe('Allow all domain users to edit')
        })
        .optional()
        .describe('Users/groups allowed to edit the protected range')
    })
  )
  .output(
    z.object({
      protectedRangeId: z.number().optional().describe('ID of the protected range'),
      operationPerformed: z.string().describe('Description of the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SheetsClient({ token: ctx.auth.token });

    if (ctx.input.operation === 'protect') {
      if (ctx.input.sheetId === undefined) {
        throw new Error('sheetId is required for protect operation');
      }

      let protectedRangeId = await client.addProtectedRange(
        ctx.input.spreadsheetId,
        {
          sheetId: ctx.input.sheetId,
          startRowIndex: ctx.input.startRowIndex,
          endRowIndex: ctx.input.endRowIndex,
          startColumnIndex: ctx.input.startColumnIndex,
          endColumnIndex: ctx.input.endColumnIndex
        },
        {
          description: ctx.input.description,
          warningOnly: ctx.input.warningOnly,
          editors: ctx.input.editors
        }
      );

      return {
        output: {
          protectedRangeId,
          operationPerformed: 'Created protected range'
        },
        message: `Protected range created with ID **${protectedRangeId}**.`
      };
    } else {
      if (ctx.input.protectedRangeId === undefined) {
        throw new Error('protectedRangeId is required for unprotect operation');
      }

      await client.deleteProtectedRange(ctx.input.spreadsheetId, ctx.input.protectedRangeId);

      return {
        output: {
          protectedRangeId: ctx.input.protectedRangeId,
          operationPerformed: 'Removed protected range'
        },
        message: `Removed protected range with ID **${ctx.input.protectedRangeId}**.`
      };
    }
  })
  .build();
