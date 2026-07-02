import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskSid: z.string().describe('Task SID'),
  assignmentStatus: z
    .string()
    .optional()
    .describe(
      'Assignment status (pending, reserved, assigned, wrapping, completed, canceled)'
    ),
  attributes: z.string().optional().describe('Task attributes as JSON string'),
  priority: z.number().optional().describe('Task priority'),
  reason: z.string().optional().describe('Reason for the task status change'),
  taskQueueFriendlyName: z.string().optional().describe('Task queue friendly name'),
  workerName: z.string().optional().describe('Assigned worker name'),
  workflowFriendlyName: z.string().optional().describe('Workflow friendly name'),
  age: z.number().optional().describe('Task age in seconds'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date last updated')
});

export let manageTasksTool = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Create, read, update, cancel, or list tasks in a TaskRouter workspace. Tasks represent units of work that need to be routed to workers. You can create new tasks, update their attributes or priority, complete or cancel them, and filter the task list by status or assignment.`,
  instructions: [
    'To complete a task, set assignmentStatus to "completed" and provide a reason.',
    'To cancel a task, set assignmentStatus to "canceled" and provide a reason.',
    'Task attributes must be a valid JSON string.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      workspaceSid: z.string().describe('Workspace SID'),
      taskSid: z.string().optional().describe('Task SID (required for get/update/delete)'),
      attributes: z.string().optional().describe('Task attributes as JSON string'),
      workflowSid: z.string().optional().describe('Workflow SID for routing (used in create)'),
      taskQueueSid: z.string().optional().describe('Task Queue SID to filter or assign'),
      priority: z.number().optional().describe('Task priority (higher = more important)'),
      timeout: z.number().optional().describe('Task timeout in seconds'),
      assignmentStatus: z
        .string()
        .optional()
        .describe(
          'Assignment status to filter by or set (pending, reserved, assigned, wrapping, completed, canceled)'
        ),
      reason: z.string().optional().describe('Reason for completing/canceling a task'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('Task records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TaskRouterClient(ctx.auth.token, ctx.auth.accountSid);

    if (ctx.input.action === 'list') {
      let params: Record<string, string | undefined> = {
        PageSize: String(ctx.input.pageSize || 50)
      };
      if (ctx.input.assignmentStatus) {
        params.AssignmentStatus = ctx.input.assignmentStatus;
      }
      if (ctx.input.taskQueueSid) {
        params.TaskQueueSid = ctx.input.taskQueueSid;
      }
      if (ctx.input.workflowSid) {
        params.WorkflowSid = ctx.input.workflowSid;
      }
      let result = await client.listTasks(ctx.input.workspaceSid, params);
      let tasks = (result.tasks || []).map((t: any) => ({
        taskSid: t.sid,
        assignmentStatus: t.assignment_status,
        attributes: t.attributes,
        priority: t.priority,
        reason: t.reason,
        taskQueueFriendlyName: t.task_queue_friendly_name,
        workerName: t.worker_name,
        workflowFriendlyName: t.workflow_friendly_name,
        age: t.age,
        dateCreated: t.date_created,
        dateUpdated: t.date_updated
      }));
      return {
        output: { tasks },
        message: `Found **${tasks.length}** tasks.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.taskSid) throw new Error('taskSid is required');
      let t = await client.getTask(ctx.input.workspaceSid, ctx.input.taskSid);
      return {
        output: {
          tasks: [
            {
              taskSid: t.sid,
              assignmentStatus: t.assignment_status,
              attributes: t.attributes,
              priority: t.priority,
              reason: t.reason,
              taskQueueFriendlyName: t.task_queue_friendly_name,
              workerName: t.worker_name,
              workflowFriendlyName: t.workflow_friendly_name,
              age: t.age,
              dateCreated: t.date_created,
              dateUpdated: t.date_updated
            }
          ]
        },
        message: `Task **${t.sid}** is **${t.assignment_status}**${t.worker_name ? ` (assigned to ${t.worker_name})` : ''}.`
      };
    }

    if (ctx.input.action === 'create') {
      let params: Record<string, string | undefined> = {
        Attributes: ctx.input.attributes || '{}',
        WorkflowSid: ctx.input.workflowSid,
        TaskQueueSid: ctx.input.taskQueueSid,
        Priority: ctx.input.priority?.toString(),
        Timeout: ctx.input.timeout?.toString()
      };
      let t = await client.createTask(ctx.input.workspaceSid, params);
      return {
        output: {
          tasks: [
            {
              taskSid: t.sid,
              assignmentStatus: t.assignment_status,
              attributes: t.attributes,
              priority: t.priority,
              taskQueueFriendlyName: t.task_queue_friendly_name,
              workflowFriendlyName: t.workflow_friendly_name,
              dateCreated: t.date_created,
              dateUpdated: t.date_updated
            }
          ]
        },
        message: `Created task **${t.sid}** with status **${t.assignment_status}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taskSid) throw new Error('taskSid is required');
      let params: Record<string, string | undefined> = {
        Attributes: ctx.input.attributes,
        Priority: ctx.input.priority?.toString(),
        AssignmentStatus: ctx.input.assignmentStatus,
        Reason: ctx.input.reason,
        TaskQueueSid: ctx.input.taskQueueSid
      };
      let t = await client.updateTask(ctx.input.workspaceSid, ctx.input.taskSid, params);
      return {
        output: {
          tasks: [
            {
              taskSid: t.sid,
              assignmentStatus: t.assignment_status,
              attributes: t.attributes,
              priority: t.priority,
              reason: t.reason,
              taskQueueFriendlyName: t.task_queue_friendly_name,
              workerName: t.worker_name,
              workflowFriendlyName: t.workflow_friendly_name,
              age: t.age,
              dateCreated: t.date_created,
              dateUpdated: t.date_updated
            }
          ]
        },
        message: `Updated task **${t.sid}** — status: **${t.assignment_status}**.`
      };
    }

    // delete
    if (!ctx.input.taskSid) throw new Error('taskSid is required');
    await client.deleteTask(ctx.input.workspaceSid, ctx.input.taskSid);
    return {
      output: {
        tasks: [
          {
            taskSid: ctx.input.taskSid
          }
        ]
      },
      message: `Deleted task **${ctx.input.taskSid}**.`
    };
  })
  .build();
