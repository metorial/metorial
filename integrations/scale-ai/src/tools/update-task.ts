import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update a Scale AI task's metadata, tags, or deduplication identifier. Supports replacing metadata and adding, replacing, or removing tags.`,
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
          'Replace the task metadata with these key-value pairs. Include existing keys you want to keep.'
        ),
      setTags: z
        .array(z.string().min(1))
        .max(5)
        .optional()
        .describe('Replace all existing tags with these tags'),
      addTags: z
        .array(z.string().min(1))
        .max(5)
        .optional()
        .describe('Add these tags to the task (duplicates are ignored)'),
      removeTags: z
        .array(z.string().min(1))
        .optional()
        .describe('Remove these tags from the task'),
      uniqueId: z
        .string()
        .min(1)
        .optional()
        .describe('Set the deduplication identifier. Must be unique across projects.'),
      clearUniqueId: z
        .boolean()
        .optional()
        .describe(
          'Remove the deduplication identifier so it can be reused. Cannot combine with uniqueId.'
        )
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
    if (
      ctx.input.setTags !== undefined &&
      (ctx.input.addTags !== undefined || ctx.input.removeTags !== undefined)
    ) {
      throw createApiServiceError('Use setTags by itself, or use addTags and removeTags.');
    }
    if (ctx.input.uniqueId !== undefined && ctx.input.clearUniqueId) {
      throw createApiServiceError('Choose uniqueId or clearUniqueId, not both.');
    }
    if (
      ctx.input.metadata === undefined &&
      ctx.input.setTags === undefined &&
      !ctx.input.addTags?.length &&
      !ctx.input.removeTags?.length &&
      ctx.input.uniqueId === undefined &&
      !ctx.input.clearUniqueId
    ) {
      throw createApiServiceError(
        'Provide metadata, tags, uniqueId, or clearUniqueId to update the task.'
      );
    }
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

    if (ctx.input.uniqueId !== undefined) {
      result = await client.setTaskUniqueId(ctx.input.taskId, ctx.input.uniqueId);
    } else if (ctx.input.clearUniqueId) {
      result = await client.clearTaskUniqueId(ctx.input.taskId);
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
