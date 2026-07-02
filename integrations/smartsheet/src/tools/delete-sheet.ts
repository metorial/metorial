import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let deleteSheet = SlateTool.create(spec, {
  name: 'Delete Sheet',
  key: 'delete_sheet',
  description: `Permanently delete a sheet. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    await client.deleteSheet(ctx.input.sheetId);

    return {
      output: { success: true },
      message: `Deleted sheet **${ctx.input.sheetId}**.`
    };
  })
  .build();
