import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cleanAttributes, flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Update a task in Outreach. Mark tasks as completed, change status, due date, or other task properties.
Tasks are automatically created by sequences or can be manually assigned. Use this to manage task state.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to update'),
      state: z.enum(['incomplete', 'complete']).optional().describe('Task state'),
      dueAt: z.string().optional().describe('Due date (ISO 8601 format)'),
      note: z.string().optional().describe('Task note')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      state: z.string().optional(),
      taskType: z.string().optional(),
      action: z.string().optional(),
      subject: z.string().optional(),
      dueAt: z.string().optional(),
      note: z.string().optional(),
      completedAt: z.string().optional(),
      prospectId: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      state: ctx.input.state,
      dueAt: ctx.input.dueAt,
      note: ctx.input.note
    });

    let resource = await client.updateTask(ctx.input.taskId, attributes);
    let flat = flattenResource(resource);

    return {
      output: {
        taskId: flat.id,
        state: flat.state,
        taskType: flat.taskType,
        action: flat.action,
        subject: flat.subject,
        dueAt: flat.dueAt,
        note: flat.note,
        completedAt: flat.completedAt,
        prospectId: flat.prospectId,
        updatedAt: flat.updatedAt
      },
      message: `Task **${flat.id}** updated. State: **${flat.state}**.`
    };
  })
  .build();
