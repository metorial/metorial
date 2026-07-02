import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taskEventTypes = ['Task_Add', 'Task_Update', 'Task_Delete'] as const;

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggered when a task is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of task event'),
      taskId: z.string().describe('ID of the affected task'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the affected task'),
      subject: z.string().optional().describe('Task subject'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Task priority'),
      assigneeId: z.string().optional().describe('Assigned agent ID'),
      departmentId: z.string().optional().describe('Department ID'),
      dueDate: z.string().optional().describe('Due date'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of taskEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType === 'Task_Update') {
            webhookData.includePrevState = true;
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch {
          // Continue
        }
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          /* ignore */
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let task = data.payload || data.task || data;
      let taskId = task.id || task.taskId || data.taskId || '';

      return {
        inputs: [
          {
            eventType,
            taskId: String(taskId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, taskId, payload } = ctx.input;
      let task = payload?.payload || payload?.task || payload || {};

      let normalizedType = eventType
        .replace(/^Task_/, 'task.')
        .replace(/_/g, '_')
        .toLowerCase();

      return {
        type: normalizedType,
        id: `${taskId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          taskId,
          subject: task.subject,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          departmentId: task.departmentId,
          dueDate: task.dueDate,
          previousState: task.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
