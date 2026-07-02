import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieves detailed information about a specific task by its ID, including assignees, followers, dates, status, progress, effort, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Unique task ID'),
      taskName: z.string().describe('Task name'),
      description: z.string().nullable().optional().describe('Task description'),
      projectId: z.number().optional().describe('Project ID'),
      phaseId: z.number().optional().describe('Phase ID'),
      parentTaskId: z.number().nullable().optional().describe('Parent task ID (if subtask)'),
      startDate: z.string().nullable().optional().describe('Start date'),
      dueDate: z.string().nullable().optional().describe('Due date'),
      status: z.any().optional().describe('Task status'),
      priority: z.any().optional().describe('Task priority'),
      progress: z.number().optional().describe('Progress percentage'),
      effort: z.number().optional().describe('Estimated effort in minutes'),
      atRisk: z.boolean().optional().describe('Whether task is at risk'),
      assignees: z.array(z.any()).optional().describe('Assigned users'),
      followers: z.array(z.any()).optional().describe('Following users'),
      fields: z.array(z.any()).optional().describe('Custom field values'),
      createdAt: z.number().optional().describe('Creation timestamp (epoch ms)'),
      updatedAt: z.number().optional().describe('Last update timestamp (epoch ms)'),
      createdBy: z.any().optional().describe('User who created the task'),
      updatedBy: z.any().optional().describe('User who last updated the task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTask(ctx.input.taskId);

    return {
      output: result,
      message: `Retrieved task **${result.taskName}** (ID: ${result.taskId}).`
    };
  })
  .build();
