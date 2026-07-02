import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Nozbe Teams. Modify name, assignment, due date, priority, completion status, time tracking, and other task properties. Only provided fields are updated.`,
  instructions: [
    'To complete a task, set endedAt to the current timestamp in milliseconds.',
    'To reopen a task, set endedAt to null.',
    'To prioritize a task, set priorityPosition to a numeric value. Set to null to remove priority.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      name: z.string().optional().describe('New task name'),
      projectId: z.string().optional().describe('Move task to a different project'),
      projectSectionId: z
        .string()
        .nullable()
        .optional()
        .describe('Move task to a different section (null to remove from section)'),
      responsibleId: z
        .string()
        .nullable()
        .optional()
        .describe('Reassign to a different user (null to unassign)'),
      dueAt: z
        .number()
        .nullable()
        .optional()
        .describe('New due date timestamp (null to remove due date)'),
      isAllDay: z.boolean().optional().describe('Whether the due date is all-day'),
      endedAt: z
        .number()
        .nullable()
        .optional()
        .describe('Set completion timestamp to complete, null to reopen'),
      isAbandoned: z.boolean().optional().describe('Mark as abandoned'),
      isFollowed: z.boolean().optional().describe('Follow or unfollow the task'),
      priorityPosition: z
        .number()
        .nullable()
        .optional()
        .describe('Priority position (null to remove priority)'),
      timeNeeded: z.number().nullable().optional().describe('Update estimated time needed'),
      timeSpent: z.number().nullable().optional().describe('Update time spent'),
      projectPosition: z.number().optional().describe('Position of the task in the project')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      name: z.string().describe('Updated task name'),
      projectId: z.string().optional().describe('Project ID'),
      responsibleId: z.string().nullable().optional().describe('Responsible user ID'),
      endedAt: z.number().nullable().optional().describe('Completion timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date'),
      lastModified: z.number().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.projectId !== undefined) data.project_id = ctx.input.projectId;
    if (ctx.input.projectSectionId !== undefined)
      data.project_section_id = ctx.input.projectSectionId;
    if (ctx.input.responsibleId !== undefined) data.responsible_id = ctx.input.responsibleId;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.isAllDay !== undefined) data.is_all_day = ctx.input.isAllDay;
    if (ctx.input.endedAt !== undefined) data.ended_at = ctx.input.endedAt;
    if (ctx.input.isAbandoned !== undefined) data.is_abandoned = ctx.input.isAbandoned;
    if (ctx.input.isFollowed !== undefined) data.is_followed = ctx.input.isFollowed;
    if (ctx.input.priorityPosition !== undefined)
      data.priority_position = ctx.input.priorityPosition;
    if (ctx.input.timeNeeded !== undefined) data.time_needed = ctx.input.timeNeeded;
    if (ctx.input.timeSpent !== undefined) data.time_spent = ctx.input.timeSpent;
    if (ctx.input.projectPosition !== undefined)
      data.project_position = ctx.input.projectPosition;

    let task = await client.updateTask(ctx.input.taskId, data);

    return {
      output: {
        taskId: task.id,
        name: task.name,
        projectId: task.project_id,
        responsibleId: task.responsible_id,
        endedAt: task.ended_at,
        dueAt: task.due_at,
        lastModified: task.last_modified
      },
      message: `Updated task **${task.name}** (ID: ${task.id}).`
    };
  })
  .build();
