import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update a Scale AI task's metadata and/or tags. Supports setting metadata key-value pairs and adding, replacing, or removing tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Key-value metadata to set on the task (idempotent, merges with existing metadata)'
        ),
      setTags: z
        .array(z.string())
        .optional()
        .describe('Replace all existing tags with these tags'),
      addTags: z
        .array(z.string())
        .optional()
        .describe('Add these tags to the task (duplicates are ignored)'),
      removeTags: z.array(z.string()).optional().describe('Remove these tags from the task')
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('ID of the updated task'),
        updated: z.boolean().describe('Whether the update succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.metadata) {
      result = await client.setTaskMetadata(ctx.input.taskId, ctx.input.metadata);
    }

    if (ctx.input.removeTags && ctx.input.removeTags.length > 0) {
      result = await client.deleteTaskTags(ctx.input.taskId, ctx.input.removeTags);
    }

    if (ctx.input.setTags) {
      result = await client.setTaskTags(ctx.input.taskId, ctx.input.setTags);
    } else if (ctx.input.addTags && ctx.input.addTags.length > 0) {
      result = await client.addTaskTags(ctx.input.taskId, ctx.input.addTags);
    }

    return {
      output: {
        taskId: ctx.input.taskId,
        updated: true,
        ...result
      },
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();
