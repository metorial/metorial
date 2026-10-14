import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Delete a time entry from Clockify. This permanently removes the time entry. Call get_workspaces to discover the workspace ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeEntryId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the time entry was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    await client.deleteTimeEntry(ctx.input.timeEntryId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted time entry **${ctx.input.timeEntryId}**.`
    };
  })
  .build();
