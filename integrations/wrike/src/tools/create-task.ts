import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a specified folder or project. Supports setting title, description, status, importance, dates, assignees, custom fields, and parent relationships.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('Folder or project ID where the task will be created'),
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description (supports HTML)'),
      status: z
        .string()
        .optional()
        .describe('Task status: Active, Completed, Deferred, Cancelled'),
      importance: z.string().optional().describe('Task importance: High, Normal, Low'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      duration: z.number().optional().describe('Duration in minutes'),
      responsibles: z.array(z.string()).optional().describe('Contact IDs of assignees'),
      followers: z.array(z.string()).optional().describe('Contact IDs of followers'),
      superTasks: z
        .array(z.string())
        .optional()
        .describe('Parent task IDs for subtask relationship'),
      customFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to set'),
      customStatus: z.string().optional().describe('Custom status ID to apply')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      title: z.string(),
      status: z.string(),
      importance: z.string(),
      createdDate: z.string(),
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
    if (ctx.input.startDate || ctx.input.dueDate || ctx.input.duration) {
      dates = {
        start: ctx.input.startDate,
        due: ctx.input.dueDate,
        duration: ctx.input.duration,
        type: ctx.input.duration ? 'Planned' : 'Backlog'
      };
    }

    let task = await client.createTask(ctx.input.folderId, {
      title: ctx.input.title,
      description: ctx.input.description,
      status: ctx.input.status,
      importance: ctx.input.importance,
      dates,
      responsibles: ctx.input.responsibles,
      followers: ctx.input.followers,
      superTasks: ctx.input.superTasks,
      customFields: ctx.input.customFields?.map(cf => ({ id: cf.fieldId, value: cf.value })),
      customStatus: ctx.input.customStatus
    });

    return {
      output: {
        taskId: task.id,
        title: task.title,
        status: task.status,
        importance: task.importance,
        createdDate: task.createdDate,
        permalink: task.permalink,
        parentIds: task.parentIds,
        responsibleIds: task.responsibleIds
      },
      message: `Created task **${task.title}** (${task.id}).`
    };
  })
  .build();
