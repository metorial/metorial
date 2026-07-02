import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageStoryTasks = SlateTool.create(spec, {
  name: 'Manage Story Tasks',
  key: 'manage_story_tasks',
  description: `Create, update, or delete checklist tasks on a story. Tasks are sub-items within a story that can be individually assigned and completed. Use the \`action\` field to specify the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      storyId: z.number().describe('Public ID of the story'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      taskId: z.number().optional().describe('Task ID (required for update and delete)'),
      description: z
        .string()
        .optional()
        .describe('Task description (required for create, optional for update)'),
      complete: z.boolean().optional().describe('Whether the task is complete'),
      ownerIds: z.array(z.string()).optional().describe('UUIDs of task owners')
    })
  )
  .output(
    z.object({
      taskId: z.number().nullable().describe('ID of the created/updated task'),
      description: z.string().nullable().describe('Task description'),
      complete: z.boolean().nullable().describe('Whether the task is complete'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.description) throw new Error('Description is required to create a task');
      let params: Record<string, any> = { description: ctx.input.description };
      if (ctx.input.complete !== undefined) params.complete = ctx.input.complete;
      if (ctx.input.ownerIds) params.owner_ids = ctx.input.ownerIds;

      let task = await client.createStoryTask(ctx.input.storyId, params);

      return {
        output: {
          taskId: task.id,
          description: task.description,
          complete: task.complete
        },
        message: `Created task "${task.description}" on story ${ctx.input.storyId}`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taskId) throw new Error('Task ID is required for update');
      let params: Record<string, any> = {};
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.complete !== undefined) params.complete = ctx.input.complete;
      if (ctx.input.ownerIds) params.owner_ids = ctx.input.ownerIds;

      let task = await client.updateStoryTask(ctx.input.storyId, ctx.input.taskId, params);

      return {
        output: {
          taskId: task.id,
          description: task.description,
          complete: task.complete
        },
        message: `Updated task ${ctx.input.taskId} on story ${ctx.input.storyId}`
      };
    }

    // delete
    if (!ctx.input.taskId) throw new Error('Task ID is required for delete');
    await client.deleteStoryTask(ctx.input.storyId, ctx.input.taskId);

    return {
      output: {
        taskId: null,
        description: null,
        complete: null,
        deleted: true
      },
      message: `Deleted task ${ctx.input.taskId} from story ${ctx.input.storyId}`
    };
  })
  .build();
