import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task or project in TimeCamp. To create a top-level project, omit parentId or set it to 0. To create a subtask, provide the parent task's ID.`,
  instructions: [
    'Set parentId to 0 or omit it to create a top-level project.',
    'Provide a parentId to create a task nested under an existing project or task.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the task or project'),
      parentId: z
        .number()
        .optional()
        .describe('Parent task ID. 0 or omit for top-level project.'),
      tags: z.string().optional().describe('Comma-separated tags (e.g. "IT, R&D")'),
      note: z.string().optional().describe('Description or note for the task'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether time tracked to this task is billable'),
      budgetUnit: z.string().optional().describe('Budget unit type'),
      budgeted: z.string().optional().describe('Budgeted time value'),
      userIds: z.string().optional().describe('Comma-separated user IDs to assign')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTask({
      name: ctx.input.name,
      parentId: ctx.input.parentId,
      tags: ctx.input.tags,
      note: ctx.input.note,
      billable: ctx.input.billable !== undefined ? (ctx.input.billable ? 1 : 0) : undefined,
      budgetUnit: ctx.input.budgetUnit,
      budgeted: ctx.input.budgeted,
      userIds: ctx.input.userIds
    });

    let taskId = String(result?.task_id || '');

    return {
      output: {
        taskId
      },
      message: `Created task **"${ctx.input.name}"** with ID ${taskId}.`
    };
  })
  .build();
