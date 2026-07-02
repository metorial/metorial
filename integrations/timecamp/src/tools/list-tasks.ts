import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve all tasks and projects from TimeCamp. Projects are top-level tasks (level 1), and tasks are nested beneath them hierarchically. Optionally retrieve a single task by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z
        .number()
        .optional()
        .describe('Specific task ID to retrieve. Omit to list all tasks.')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string().describe('Task/project ID'),
          parentId: z.string().describe('Parent task ID (0 for top-level projects)'),
          name: z.string().describe('Task/project name'),
          level: z.string().describe('Nesting level (1=project, 2=task, 3+=subtask)'),
          archived: z.string().describe('Whether archived (0 or 1)'),
          tags: z.string().describe('Comma-separated tags'),
          billable: z.string().describe('Whether billable (0 or 1)'),
          note: z.string().describe('Task description/note'),
          budgeted: z.string().describe('Budgeted time value')
        })
      ),
      totalTasks: z.number().describe('Total number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tasks = await client.getTasks(ctx.input.taskId);

    let mapped = (tasks || []).map(t => ({
      taskId: String(t.task_id),
      parentId: String(t.parent_id),
      name: t.name || '',
      level: String(t.level),
      archived: String(t.archived || '0'),
      tags: t.tags || '',
      billable: String(t.billable || '0'),
      note: t.note || '',
      budgeted: t.budgeted || ''
    }));

    return {
      output: {
        tasks: mapped,
        totalTasks: mapped.length
      },
      message: `Retrieved **${mapped.length}** tasks.`
    };
  })
  .build();
