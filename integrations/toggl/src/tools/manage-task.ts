import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('Task ID'),
  name: z.string().describe('Task name'),
  projectId: z.number().describe('Parent project ID'),
  workspaceId: z.number().describe('Workspace ID'),
  active: z.boolean().describe('Whether the task is active'),
  estimatedSeconds: z.number().nullable().describe('Estimated duration in seconds'),
  trackedSeconds: z.number().nullable().describe('Tracked time in seconds'),
  userId: z.number().nullable().describe('Assigned user ID')
});

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, or delete a task under a project in Toggl Track. Tasks provide granular categorization within projects. Requires a paid plan.
To **create**: provide a projectId and name. To **update**: provide a projectId, taskId, and fields to change. To **delete**: provide both IDs and set \`delete\` to true.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      projectId: z.string().describe('Project ID the task belongs to'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the task'),
      name: z.string().optional().describe('Task name (required for create)'),
      active: z.boolean().optional().describe('Whether the task is active'),
      estimatedSeconds: z.number().optional().describe('Estimated duration in seconds'),
      userId: z.number().optional().describe('User ID to assign the task to')
    })
  )
  .output(
    z.object({
      task: taskOutputSchema.nullable().describe('The created/updated task, null if deleted'),
      deleted: z.boolean().describe('Whether a task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    if (ctx.input.delete && ctx.input.taskId) {
      await client.deleteTask(wsId, ctx.input.projectId, ctx.input.taskId);
      return {
        output: { task: null, deleted: true },
        message: `Deleted task **#${ctx.input.taskId}**`
      };
    }

    let result: any;
    if (ctx.input.taskId) {
      result = await client.updateTask(wsId, ctx.input.projectId, ctx.input.taskId, {
        name: ctx.input.name,
        active: ctx.input.active,
        estimatedSeconds: ctx.input.estimatedSeconds,
        userId: ctx.input.userId
      });
    } else {
      if (!ctx.input.name) throw new Error('Task name is required when creating a new task.');
      result = await client.createTask(wsId, ctx.input.projectId, {
        name: ctx.input.name,
        active: ctx.input.active,
        estimatedSeconds: ctx.input.estimatedSeconds,
        userId: ctx.input.userId
      });
    }

    let mapped = {
      taskId: result.id,
      name: result.name,
      projectId: result.project_id ?? Number.parseInt(ctx.input.projectId, 10),
      workspaceId: result.workspace_id ?? result.wid,
      active: result.active ?? true,
      estimatedSeconds: result.estimated_seconds ?? null,
      trackedSeconds: result.tracked_seconds ?? null,
      userId: result.user_id ?? null
    };

    return {
      output: { task: mapped, deleted: false },
      message: ctx.input.taskId
        ? `Updated task **${result.name}**`
        : `Created task **${result.name}**`
    };
  })
  .build();
