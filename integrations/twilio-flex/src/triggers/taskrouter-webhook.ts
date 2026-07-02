import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskRouterWebhookTrigger = SlateTrigger.create(spec, {
  name: 'TaskRouter Webhook',
  key: 'taskrouter_webhook',
  description:
    'Receives real-time TaskRouter event callbacks. Configure your workspace Event Callback URL to point to this webhook. Covers task events, reservation events, worker activity changes, and queue events.'
})
  .input(
    z.object({
      eventType: z.string().describe('TaskRouter event type'),
      eventSid: z.string().describe('Unique event identifier'),
      resourceType: z
        .string()
        .optional()
        .describe('Type of resource (task, reservation, worker, etc.)'),
      resourceSid: z.string().optional().describe('SID of the affected resource'),
      workspaceSid: z.string().optional().describe('Workspace SID'),
      taskSid: z.string().optional().describe('Task SID (if task-related)'),
      workerSid: z.string().optional().describe('Worker SID (if worker-related)'),
      workerName: z.string().optional().describe('Worker friendly name'),
      workerActivityName: z.string().optional().describe('Worker activity name'),
      taskQueueSid: z.string().optional().describe('Task Queue SID'),
      taskQueueName: z.string().optional().describe('Task Queue name'),
      taskAttributes: z.string().optional().describe('Task attributes as JSON string'),
      taskAssignmentStatus: z.string().optional().describe('Task assignment status'),
      reservationSid: z.string().optional().describe('Reservation SID'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('TaskRouter event type'),
      resourceSid: z.string().optional().describe('SID of the affected resource'),
      workspaceSid: z.string().optional().describe('Workspace SID'),
      taskSid: z.string().optional().describe('Task SID'),
      workerSid: z.string().optional().describe('Worker SID'),
      workerName: z.string().optional().describe('Worker friendly name'),
      workerActivityName: z.string().optional().describe('Worker activity name'),
      taskQueueSid: z.string().optional().describe('Task Queue SID'),
      taskQueueName: z.string().optional().describe('Task Queue name'),
      taskAttributes: z.string().optional().describe('Task attributes as JSON string'),
      taskAssignmentStatus: z.string().optional().describe('Task assignment status'),
      reservationSid: z.string().optional().describe('Reservation SID'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: string;
      let data: Record<string, string>;

      try {
        body = await ctx.request.text();
        data = {};
        for (let pair of body.split('&')) {
          let [key, value] = pair.split('=');
          if (key && value !== undefined) {
            data[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
          }
        }
      } catch {
        return { inputs: [] };
      }

      let eventType = data.EventType || 'unknown';
      let eventSid = data.Sid || `${eventType}-${Date.now()}`;

      let resourceType = 'unknown';
      if (eventType.startsWith('task.')) resourceType = 'task';
      else if (eventType.startsWith('reservation.')) resourceType = 'reservation';
      else if (eventType.startsWith('worker.')) resourceType = 'worker';
      else if (eventType.startsWith('task_queue.')) resourceType = 'task_queue';
      else if (eventType.startsWith('workflow.')) resourceType = 'workflow';

      return {
        inputs: [
          {
            eventType,
            eventSid,
            resourceType,
            resourceSid: data.ResourceSid || data.TaskSid || data.WorkerSid || data.Sid,
            workspaceSid: data.WorkspaceSid,
            taskSid: data.TaskSid,
            workerSid: data.WorkerSid,
            workerName: data.WorkerName,
            workerActivityName: data.WorkerActivityName,
            taskQueueSid: data.TaskQueueSid,
            taskQueueName: data.TaskQueueName,
            taskAttributes: data.TaskAttributes,
            taskAssignmentStatus: data.TaskAssignmentStatus,
            reservationSid: data.ReservationSid,
            timestamp: data.Timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventSid,
        output: {
          eventType: ctx.input.eventType,
          resourceSid: ctx.input.resourceSid,
          workspaceSid: ctx.input.workspaceSid,
          taskSid: ctx.input.taskSid,
          workerSid: ctx.input.workerSid,
          workerName: ctx.input.workerName,
          workerActivityName: ctx.input.workerActivityName,
          taskQueueSid: ctx.input.taskQueueSid,
          taskQueueName: ctx.input.taskQueueName,
          taskAttributes: ctx.input.taskAttributes,
          taskAssignmentStatus: ctx.input.taskAssignmentStatus,
          reservationSid: ctx.input.reservationSid,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
