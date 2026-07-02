import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from Bonsai, optionally filtered by project. Returns task details including title, assignee, priority, status, and dates.`,
  instructions: [
    'Provide a **projectId** to filter tasks for a specific project, or omit it to list all tasks.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter tasks by project ID')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            title: z.string().describe('Task title'),
            projectId: z.string().optional().describe('Project ID'),
            assigneeEmail: z.string().optional().describe('Assignee email'),
            priority: z.string().optional().describe('Priority level'),
            status: z.string().optional().describe('Task status'),
            startDate: z.string().optional().describe('Start date'),
            dueDate: z.string().optional().describe('Due date'),
            timeEstimate: z.number().optional().describe('Time estimate in hours'),
            billingType: z.string().optional().describe('Billing type')
          })
        )
        .describe('List of tasks'),
      totalCount: z.number().describe('Total number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tasks = await client.listTasks(ctx.input.projectId);

    return {
      output: {
        tasks: tasks.map(t => ({
          taskId: t.id,
          title: t.title,
          projectId: t.projectId,
          assigneeEmail: t.assigneeEmail,
          priority: t.priority,
          status: t.status,
          startDate: t.startDate,
          dueDate: t.dueDate,
          timeEstimate: t.timeEstimate,
          billingType: t.billingType
        })),
        totalCount: tasks.length
      },
      message: `Found **${tasks.length}** tasks${ctx.input.projectId ? ` in project \`${ctx.input.projectId}\`` : ''}.`
    };
  })
  .build();
