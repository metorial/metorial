import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve detailed information about a specific task by its ID, including all task properties such as assignment, due date, priority, time tracking, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique task identifier'),
      name: z.string().describe('Task name'),
      projectId: z.string().optional().describe('Project the task belongs to'),
      projectSectionId: z.string().nullable().optional().describe('Project section ID'),
      authorId: z.string().optional().describe('ID of the user who created the task'),
      responsibleId: z.string().nullable().optional().describe('Assigned user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      lastModified: z.number().optional().describe('Last modification timestamp'),
      dueAt: z.number().nullable().optional().describe('Due date timestamp'),
      endedAt: z.number().nullable().optional().describe('Completion timestamp'),
      isFollowed: z.boolean().optional().describe('Whether the task is followed'),
      isAbandoned: z.boolean().optional().describe('Whether the task is abandoned'),
      isAllDay: z.boolean().optional().describe('Whether the due date is all-day'),
      priorityPosition: z.number().nullable().optional().describe('Priority position'),
      timeNeeded: z.number().nullable().optional().describe('Estimated time needed'),
      timeSpent: z.number().nullable().optional().describe('Time spent'),
      lastActivityAt: z.number().optional().describe('Last activity timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: t.id,
        name: t.name,
        projectId: t.project_id,
        projectSectionId: t.project_section_id,
        authorId: t.author_id,
        responsibleId: t.responsible_id,
        createdAt: t.created_at,
        lastModified: t.last_modified,
        dueAt: t.due_at,
        endedAt: t.ended_at,
        isFollowed: t.is_followed,
        isAbandoned: t.is_abandoned,
        isAllDay: t.is_all_day,
        priorityPosition: t.priority_position,
        timeNeeded: t.time_needed,
        timeSpent: t.time_spent,
        lastActivityAt: t.last_activity_at
      },
      message: `Retrieved task **${t.name}** (ID: ${t.id}).`
    };
  })
  .build();
