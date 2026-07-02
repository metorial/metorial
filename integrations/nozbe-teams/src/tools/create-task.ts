import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Nozbe Teams. Assign it to a project and section, set responsibility, due date, priority, and time tracking values.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Task name (1-255 characters)'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to add the task to (or "task_me" for personal tasks)'),
      projectSectionId: z
        .string()
        .optional()
        .describe('Project section ID to place the task in'),
      responsibleId: z
        .string()
        .optional()
        .describe('User ID of the person responsible (or "author" for the creator)'),
      dueAt: z.number().optional().describe('Due date as a timestamp in milliseconds'),
      isAllDay: z.boolean().optional().describe('Whether the due date is an all-day event'),
      isFollowed: z
        .boolean()
        .optional()
        .describe('Whether to follow the task for notifications'),
      timeNeeded: z.number().optional().describe('Estimated time needed in milliseconds')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      name: ctx.input.name
    };
    if (ctx.input.projectId !== undefined) data.project_id = ctx.input.projectId;
    if (ctx.input.projectSectionId !== undefined)
      data.project_section_id = ctx.input.projectSectionId;
    if (ctx.input.responsibleId !== undefined) data.responsible_id = ctx.input.responsibleId;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.isAllDay !== undefined) data.is_all_day = ctx.input.isAllDay;
    if (ctx.input.isFollowed !== undefined) data.is_followed = ctx.input.isFollowed;
    if (ctx.input.timeNeeded !== undefined) data.time_needed = ctx.input.timeNeeded;

    let task = await client.createTask(data);

    return {
      output: {
        taskId: task.id,
        name: task.name,
        projectId: task.project_id,
        responsibleId: task.responsible_id,
        createdAt: task.created_at,
        dueAt: task.due_at
      },
      message: `Created task **${task.name}** (ID: ${task.id}).`
    };
  })
  .build();
