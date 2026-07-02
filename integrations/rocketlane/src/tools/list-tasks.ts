import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Lists tasks in Rocketlane with optional filtering by project or phase. Returns task summaries with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter tasks by project ID'),
      phaseId: z.number().optional().describe('Filter tasks by phase ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of tasks to return')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.number().describe('Task ID'),
            taskName: z.string().describe('Task name'),
            projectId: z.number().optional().describe('Project ID'),
            phaseId: z.number().optional().describe('Phase ID'),
            status: z.any().optional().describe('Task status'),
            startDate: z.string().nullable().optional().describe('Start date'),
            dueDate: z.string().nullable().optional().describe('Due date'),
            progress: z.number().optional().describe('Progress percentage'),
            assignees: z.array(z.any()).optional().describe('Assigned users')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks({
      projectId: ctx.input.projectId,
      phaseId: ctx.input.phaseId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let tasks = Array.isArray(result) ? result : (result.tasks ?? result.data ?? []);

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
