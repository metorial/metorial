import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Permanently delete a time entry from Toggl Track. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
      timeEntryId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let wsId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);

    await client.deleteTimeEntry(wsId, ctx.input.timeEntryId);

    return {
      output: { deleted: true },
      message: `Deleted time entry **#${ctx.input.timeEntryId}**`
    };
  })
  .build();
