import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('ID of the task'),
  workflowRunId: z.string().optional().describe('ID of the parent workflow run'),
  name: z.string().describe('Name of the task'),
  status: z.string().describe('Status: NotCompleted or Completed'),
  taskType: z.string().optional().describe('Type: Standard, Approval, AI, or Code'),
  dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
  hidden: z.boolean().optional().describe('Whether the task is hidden by conditional logic'),
  stopped: z.boolean().optional().describe('Whether the task is blocked by a prior task'),
  completedDate: z.string().optional().describe('Date the task was completed')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks for a workflow run, or list tasks assigned to a specific user. Use this to view all steps in a workflow run or find tasks assigned to someone.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowRunId: z
        .string()
        .optional()
        .describe('ID of the workflow run to list tasks for'),
      assigneeEmail: z
        .string()
        .optional()
        .describe(
          'Email of the user to find assigned tasks for (required if workflowRunId is not provided)'
        ),
      workflowId: z
        .string()
        .optional()
        .describe('Filter assigned tasks by workflow ID (only used with assigneeEmail)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.workflowRunId) {
      data = await client.listWorkflowRunTasks(ctx.input.workflowRunId);
    } else if (ctx.input.assigneeEmail) {
      data = await client.listTasksByAssignee(ctx.input.assigneeEmail, ctx.input.workflowId);
    } else {
      throw new Error('Either workflowRunId or assigneeEmail must be provided');
    }

    let tasks = (data.tasks || []).map((t: any) => ({
      taskId: t.id,
      workflowRunId: t.workflowRunId,
      name: t.name,
      status: t.status,
      taskType: t.taskType,
      dueDate: t.dueDate,
      hidden: t.hidden,
      stopped: t.stopped,
      completedDate: t.completedDate
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
