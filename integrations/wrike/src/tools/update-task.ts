import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's properties including title, description, status, importance, dates, assignees, custom fields, and parent folders. Supports adding/removing assignees and parent folders independently.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('New task title'),
      description: z.string().optional().describe('New task description (supports HTML)'),
      status: z
        .string()
        .optional()
        .describe('New status: Active, Completed, Deferred, Cancelled'),
      importance: z.string().optional().describe('New importance: High, Normal, Low'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      duration: z.number().optional().describe('New duration in minutes'),
      addResponsibles: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to add as assignees'),
      removeResponsibles: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to remove from assignees'),
      addParents: z
        .array(z.string())
        .optional()
        .describe('Folder/project IDs to add as parents'),
      removeParents: z
        .array(z.string())
        .optional()
        .describe('Folder/project IDs to remove from parents'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      customStatus: z.string().optional().describe('Custom status ID to apply'),
      restore: z.boolean().optional().describe('Set to true to restore a deleted task')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      title: z.string(),
      status: z.string(),
      importance: z.string(),
      updatedDate: z.string(),
      permalink: z.string().optional(),
      parentIds: z.array(z.string()),
      responsibleIds: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let dates: { start?: string; due?: string; duration?: number; type?: string } | undefined;
    if (
      ctx.input.startDate !== undefined ||
      ctx.input.dueDate !== undefined ||
      ctx.input.duration !== undefined
    ) {
      dates = {
        start: ctx.input.startDate,
        due: ctx.input.dueDate,
        duration: ctx.input.duration
      };
    }

    let task = await client.updateTask(ctx.input.taskId, {
      title: ctx.input.title,
      description: ctx.input.description,
      status: ctx.input.status,
      importance: ctx.input.importance,
      dates,
      addResponsibles: ctx.input.addResponsibles,
      removeResponsibles: ctx.input.removeResponsibles,
      addParents: ctx.input.addParents,
      removeParents: ctx.input.removeParents,
      customFields: ctx.input.customFields?.map(cf => ({ id: cf.fieldId, value: cf.value })),
      customStatus: ctx.input.customStatus,
      restore: ctx.input.restore
    });

    return {
      output: {
        taskId: task.id,
        title: task.title,
        status: task.status,
        importance: task.importance,
        updatedDate: task.updatedDate,
        permalink: task.permalink,
        parentIds: task.parentIds,
        responsibleIds: task.responsibleIds
      },
      message: `Updated task **${task.title}** (${task.id}).`
    };
  })
  .build();
