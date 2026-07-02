import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Manage a conversion task's lifecycle — update its file retention mode or permanently delete task files.

**Retention modes:**
- \`standard_24h\` — Default; files are deleted after 24 hours.
- \`ttl_15m\` — Files are deleted after 15 minutes (paid plans only).

**Delete** permanently removes all files associated with the task (paid plans only).`,
  constraints: [
    'The ttl_15m retention mode and immediate deletion require a paid plan.',
    'Deletion is permanent and irreversible.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to manage'),
      action: z
        .enum(['update_retention', 'delete'])
        .describe('The management action to perform'),
      retentionMode: z
        .enum(['standard_24h', 'ttl_15m'])
        .optional()
        .describe('New retention mode (required when action is "update_retention")')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The task ID'),
      action: z.string().describe('The action that was performed'),
      retentionMode: z
        .string()
        .optional()
        .describe('Updated retention mode (for update_retention action)'),
      dateExpires: z
        .string()
        .optional()
        .describe('New expiration date (for update_retention action)'),
      dateDeleted: z.string().optional().describe('Deletion timestamp (for delete action)'),
      message: z.string().describe('Human-readable result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'update_retention') {
      if (!ctx.input.retentionMode) {
        throw new Error('retentionMode is required when action is "update_retention"');
      }

      let result = await client.updateTaskRetention(ctx.input.taskId, ctx.input.retentionMode);

      return {
        output: {
          taskId: ctx.input.taskId,
          action: 'update_retention',
          retentionMode: result.retentionMode,
          dateExpires: result.dateExpires,
          message: `Retention mode updated to ${result.retentionMode}. Files expire at ${result.dateExpires}.`
        },
        message: `Task **${ctx.input.taskId}** retention updated to **${result.retentionMode}**. Expires: ${result.dateExpires}.`
      };
    }

    let result = await client.deleteTask(ctx.input.taskId);

    return {
      output: {
        taskId: ctx.input.taskId,
        action: 'delete',
        dateDeleted: result.dateDeleted,
        message: result.message
      },
      message: `Task **${ctx.input.taskId}** files have been permanently deleted.`
    };
  })
  .build();
