import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Delete a time entry from Clockify. This permanently removes the time entry.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the time entry was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteTimeEntry(ctx.input.timeEntryId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted time entry **${ctx.input.timeEntryId}**.`
    };
  })
  .build();
