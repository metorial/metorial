import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let deleteTask = SlateTool.create(spec, {
  name: 'Desk Delete Task',
  key: 'desk_delete_task',
  description: `Permanently delete a task by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task **${ctx.input.taskId}**`
    };
  })
  .build();
