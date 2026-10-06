import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, display, reference } from '../lib/client';
import { workerIdSchema } from '../lib/contracts';
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
    .describe('The type of step in the business process'),
  assignedDate: z.string().optional().describe('Date when the event was last updated'),
  statusReference: workdayReferenceSchema.optional().describe('Native task status reference'),
  subjectReference: workdayReferenceSchema.optional().describe('Native task subject reference')
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
      workerId: workerIdSchema,
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
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.getInboxTasks(ctx.input.workerId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let tasks = result.data.map(t => ({
      taskId: t.id,
      descriptor: t.descriptor,
      href: t.href,
      status: display(t.status),
      assigned:
        typeof t.assigned === 'object' && t.assigned !== null
          ? reference(t.assigned)
          : undefined,
      assignedDate: typeof t.assigned === 'string' ? t.assigned : undefined,
      statusReference:
        typeof t.status === 'object' && t.status !== null ? reference(t.status) : undefined,
      subjectReference:
        typeof t.subject === 'object' && t.subject !== null ? reference(t.subject) : undefined,
      subject: display(t.subject),
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
  description: `Approve or deny a pending inbox task for a worker. Only an Approval step awaiting action for the connected worker is supported. Discover that worker with get_current_user and read the task first; subsequent business-process steps may remain pending.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workerId: workerIdSchema,
      taskId: z.string().describe('The inbox task ID to act on'),
      action: z.enum(['approve', 'deny']).describe('Action to take on the task'),
      comment: z.string().optional().describe('Optional comment explaining the action')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The inbox task ID that was acted upon'),
      action: z.string().describe('The action that was taken'),
      success: z.boolean().describe('Whether Workday accepted this approval-task action'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    const result = await client.actionInboxTask(
      ctx.input.workerId,
      ctx.input.taskId,
      ctx.input.action,
      ctx.input.comment
    );

    return {
      output: {
        taskId: ctx.input.taskId,
        action: ctx.input.action,
        success: true,
        rawResponse: result
      },
      message:
        'Workday accepted the approval-task action. The overall business process may still have pending steps.'
    };
  })
  .build();
