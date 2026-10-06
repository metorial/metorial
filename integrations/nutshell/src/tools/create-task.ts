import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Nutshell CRM for tracking follow-ups and action items. Tasks can be assigned to users and associated with leads.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z
        .string()
        .describe('Description of the task; also used as the title when title is omitted'),
      title: z.string().optional().describe('Task title'),
      dueTime: z.string().optional().describe('Due date/time for the task (ISO 8601 format)'),
      assigneeId: z.number().optional().describe('User ID to assign the task to'),
      leadIds: z
        .array(z.number())
        .optional()
        .describe('Related lead ID; provide at most one. A task supports one related entity.')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task'),
      rev: z.string().describe('Revision identifier'),
      description: z.string().optional().describe('Description of the task'),
      entityType: z.string().describe('Entity type (Tasks)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let taskData: Record<string, unknown> = {
      description: ctx.input.description,
      title: ctx.input.title ?? ctx.input.description
    };

    if (ctx.input.dueTime !== undefined) taskData.dueTime = ctx.input.dueTime;
    if (ctx.input.assigneeId !== undefined)
      taskData.assignee = { entityType: 'Users', id: ctx.input.assigneeId };
    if (ctx.input.leadIds) {
      taskData.leads = ctx.input.leadIds.map(id => ({ entityType: 'Leads', id }));
    }

    let result = await client.newTask(taskData);

    return {
      output: {
        taskId: result.id,
        rev: String(result.rev),
        description: result.description ?? result.title,
        entityType: result.entityType
      },
      message: `Created task (ID: ${result.id}).`
    };
  })
  .build();
