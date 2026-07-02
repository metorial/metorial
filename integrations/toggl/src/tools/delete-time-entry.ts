import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
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
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      timeEntryId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    await client.deleteTimeEntry(wsId, ctx.input.timeEntryId);

    return {
      output: { deleted: true },
      message: `Deleted time entry **#${ctx.input.timeEntryId}**`
    };
  })
  .build();
