import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z.object({
  id: z.string().optional().describe('Workday ID'),
  descriptor: z.string().optional().describe('Display name'),
  href: z.string().optional().describe('API href')
});

let inboxTaskSchema = z.object({
  taskId: z.string().describe('Inbox task ID'),
  descriptor: z.string().optional().describe('Task description'),
  href: z.string().optional().describe('API href for the task'),
  status: z.string().optional().describe('Task status'),
  assigned: workdayReferenceSchema.optional().describe('Worker the task is assigned to'),
  subject: z.string().optional().describe('Task subject line'),
  overallProcess: workdayReferenceSchema
    .optional()
    .describe('The overall business process this task belongs to'),
  stepType: workdayReferenceSchema
    .optional()
    .describe('The type of step in the business process')
});

export let getInboxTasks = SlateTool.create(spec, {
  name: 'Get Inbox Tasks',
  key: 'get_inbox_tasks',
  description: `Retrieve pending inbox tasks for a specific worker. Returns business process steps awaiting action, such as approvals, reviews, and to-do items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID whose inbox tasks to retrieve'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      tasks: z.array(inboxTaskSchema).describe('List of inbox tasks'),
      total: z.number().describe('Total number of inbox tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.getInboxTasks(ctx.input.workerId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let tasks = result.data.map(t => ({
      taskId: t.id,
      descriptor: t.descriptor,
      href: t.href,
      status: t.status,
      assigned: t.assigned,
      subject: t.subject,
      overallProcess: t.overallProcess,
      stepType: t.stepType
    }));

    return {
      output: { tasks, total: result.total },
      message: `Retrieved **${result.total}** inbox tasks for worker ${ctx.input.workerId}. Returned ${tasks.length} results.`
    };
  })
  .build();

export let actionInboxTask = SlateTool.create(spec, {
  name: 'Action Inbox Task',
  key: 'action_inbox_task',
  description: `Approve or deny a pending inbox task for a worker. Use this to take action on business process steps such as approvals, reviews, or other workflow items awaiting a decision.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID who owns the inbox task'),
      taskId: z.string().describe('The inbox task ID to act on'),
      action: z.enum(['approve', 'deny']).describe('Action to take on the task'),
      comment: z.string().optional().describe('Optional comment explaining the action')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The inbox task ID that was acted upon'),
      action: z.string().describe('The action that was taken'),
      success: z.boolean().describe('Whether the action was successful'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result: any;
    if (ctx.input.action === 'approve') {
      result = await client.approveInboxTask(
        ctx.input.workerId,
        ctx.input.taskId,
        ctx.input.comment
      );
    } else {
      result = await client.denyInboxTask(
        ctx.input.workerId,
        ctx.input.taskId,
        ctx.input.comment
      );
    }

    return {
      output: {
        taskId: ctx.input.taskId,
        action: ctx.input.action,
        success: true,
        rawResponse: result
      },
      message: `Inbox task ${ctx.input.taskId} was **${ctx.input.action === 'approve' ? 'approved' : 'denied'}** for worker ${ctx.input.workerId}.`
    };
  })
  .build();
