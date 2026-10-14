import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve a Bonsai task, including its description, board column, dates, estimate, tags, and link.',
  instructions: ['Call list_tasks to find the taskId. Task identifiers are UUIDs.'],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ taskId: z.string().describe('Task ID returned by list_tasks') }))
  .output(
    z.object({
      taskId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      projectId: z.string().optional(),
      assigneeMemberId: z.string().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
      taskStatusId: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      timeEstimate: z.number().optional().describe('Estimated effort in hours'),
      billingType: z
        .string()
        .optional()
        .describe('billable or non_billable; omitted without billing permission'),
      tags: z.array(z.string()).optional(),
      completedAt: z.string().optional(),
      archivedAt: z.string().optional(),
      url: z.string().optional().describe('Link to the task in Bonsai')
    })
  )
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth).getTask(ctx.input.taskId);
    return {
      output: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        assigneeMemberId: task.assigneeMemberId,
        priority: task.priority,
        status: task.status,
        taskStatusId: task.taskStatusId,
        startDate: task.startDate,
        dueDate: task.dueDate,
        timeEstimate: task.timeEstimate,
        billingType: task.billingType,
        tags: task.tags,
        completedAt: task.completedAt,
        archivedAt: task.archivedAt,
        url: task.url
      },
      message: `Retrieved task **${task.title}** (\`${task.id}\`).`
    };
  })
  .build();
