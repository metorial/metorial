import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { spec } from '../spec';

let taskQueueSchema = z.object({
  taskQueueSid: z.string().describe('Task Queue SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  targetWorkers: z.string().optional().describe('Worker target expression'),
  maxReservedWorkers: z.number().optional().describe('Max reserved workers'),
  reservationActivitySid: z.string().optional().describe('Activity SID for reserved workers'),
  assignmentActivitySid: z.string().optional().describe('Activity SID for assigned workers'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date last updated')
});

export let manageTaskQueuesTool = SlateTool.create(spec, {
  name: 'Manage Task Queues',
  key: 'manage_task_queues',
  description: `Create, read, update, delete, or list task queues in a TaskRouter workspace. Task queues hold tasks waiting to be assigned to workers. Each queue has a target worker expression that determines which workers are eligible to receive tasks from it.`,
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
      taskQueueSid: z
        .string()
        .optional()
        .describe('Task Queue SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name for the queue'),
      targetWorkers: z
        .string()
        .optional()
        .describe('Worker target expression (e.g., "skills HAS \'billing\'")'),
      maxReservedWorkers: z
        .number()
        .optional()
        .describe('Max number of workers reserved for a task'),
      reservationActivitySid: z
        .string()
        .optional()
        .describe('Activity SID for reserved workers'),
      assignmentActivitySid: z
        .string()
        .optional()
        .describe('Activity SID for assigned workers'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      taskQueues: z.array(taskQueueSchema).describe('Task queue records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TaskRouterClient(ctx.auth.token, ctx.auth.accountSid);

    if (ctx.input.action === 'list') {
      let result = await client.listTaskQueues(ctx.input.workspaceSid, ctx.input.pageSize);
      let taskQueues = (result.task_queues || []).map((q: any) => ({
        taskQueueSid: q.sid,
        friendlyName: q.friendly_name,
        targetWorkers: q.target_workers,
        maxReservedWorkers: q.max_reserved_workers,
        reservationActivitySid: q.reservation_activity_sid,
        assignmentActivitySid: q.assignment_activity_sid,
        dateCreated: q.date_created,
        dateUpdated: q.date_updated
      }));
      return {
        output: { taskQueues },
        message: `Found **${taskQueues.length}** task queues.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.taskQueueSid) throw new Error('taskQueueSid is required');
      let q = await client.getTaskQueue(ctx.input.workspaceSid, ctx.input.taskQueueSid);
      return {
        output: {
          taskQueues: [
            {
              taskQueueSid: q.sid,
              friendlyName: q.friendly_name,
              targetWorkers: q.target_workers,
              maxReservedWorkers: q.max_reserved_workers,
              reservationActivitySid: q.reservation_activity_sid,
              assignmentActivitySid: q.assignment_activity_sid,
              dateCreated: q.date_created,
              dateUpdated: q.date_updated
            }
          ]
        },
        message: `Task queue **${q.friendly_name}** (${q.sid}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) throw new Error('friendlyName is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        TargetWorkers: ctx.input.targetWorkers,
        MaxReservedWorkers: ctx.input.maxReservedWorkers?.toString(),
        ReservationActivitySid: ctx.input.reservationActivitySid,
        AssignmentActivitySid: ctx.input.assignmentActivitySid
      };
      let q = await client.createTaskQueue(ctx.input.workspaceSid, params);
      return {
        output: {
          taskQueues: [
            {
              taskQueueSid: q.sid,
              friendlyName: q.friendly_name,
              targetWorkers: q.target_workers,
              maxReservedWorkers: q.max_reserved_workers,
              reservationActivitySid: q.reservation_activity_sid,
              assignmentActivitySid: q.assignment_activity_sid,
              dateCreated: q.date_created,
              dateUpdated: q.date_updated
            }
          ]
        },
        message: `Created task queue **${q.friendly_name}** (${q.sid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taskQueueSid) throw new Error('taskQueueSid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        TargetWorkers: ctx.input.targetWorkers,
        MaxReservedWorkers: ctx.input.maxReservedWorkers?.toString(),
        ReservationActivitySid: ctx.input.reservationActivitySid,
        AssignmentActivitySid: ctx.input.assignmentActivitySid
      };
      let q = await client.updateTaskQueue(
        ctx.input.workspaceSid,
        ctx.input.taskQueueSid,
        params
      );
      return {
        output: {
          taskQueues: [
            {
              taskQueueSid: q.sid,
              friendlyName: q.friendly_name,
              targetWorkers: q.target_workers,
              maxReservedWorkers: q.max_reserved_workers,
              reservationActivitySid: q.reservation_activity_sid,
              assignmentActivitySid: q.assignment_activity_sid,
              dateCreated: q.date_created,
              dateUpdated: q.date_updated
            }
          ]
        },
        message: `Updated task queue **${q.friendly_name}** (${q.sid}).`
      };
    }

    // delete
    if (!ctx.input.taskQueueSid) throw new Error('taskQueueSid is required');
    await client.deleteTaskQueue(ctx.input.workspaceSid, ctx.input.taskQueueSid);
    return {
      output: {
        taskQueues: [
          {
            taskQueueSid: ctx.input.taskQueueSid
          }
        ]
      },
      message: `Deleted task queue **${ctx.input.taskQueueSid}**.`
    };
  })
  .build();
