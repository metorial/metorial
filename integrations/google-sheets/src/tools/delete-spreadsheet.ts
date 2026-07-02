import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriveClient } from '../lib/drive-client';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteSpreadsheet = SlateTool.create(spec, {
  name: 'Delete Spreadsheet',
  key: 'delete_spreadsheet',
  description: `Permanently deletes a spreadsheet from Google Drive. This action cannot be undone. Requires Drive scope.`,
  constraints: [
    'Requires the https://www.googleapis.com/auth/drive scope.',
    'This permanently deletes the file - it cannot be recovered.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSheetsActionScopes.deleteSpreadsheet)
  .input(
    z.object({
      spreadsheetId: z.string().describe('Unique ID of the spreadsheet to delete')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the deleted spreadsheet'),
      deleted: z.boolean().describe('Whether the spreadsheet was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriveClient(ctx.auth.token);
    await client.deleteFile(ctx.input.spreadsheetId);

    return {
      output: {
        spreadsheetId: ctx.input.spreadsheetId,
        deleted: true
      },
      message: `Permanently deleted spreadsheet ${ctx.input.spreadsheetId}.`
    };
  })
  .build();
