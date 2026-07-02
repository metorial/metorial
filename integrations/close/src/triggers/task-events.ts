import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers when a task is created, updated, or deleted in Close.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action that occurred (created, updated, deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('ID of the affected task'),
      objectType: z.string().describe('Object type (task)'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('Fields that changed during an update'),
      currentData: z.any().optional().describe('Current data after the change'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event was created')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the affected task'),
      action: z.string().describe('The action that occurred'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed'),
      leadId: z.string().optional().describe('ID of the parent lead'),
      text: z.string().optional().describe('Task text/description'),
      assignedTo: z.string().optional().describe('User ID the task is assigned to'),
      isComplete: z.boolean().optional().describe('Whether the task is complete'),
      dueDate: z.string().optional().describe('Task due date'),
      taskType: z.string().optional().describe('Type of task (lead, outgoing_call, etc.)'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          { object_type: 'task', action: 'created' },
          { object_type: 'task', action: 'updated' },
          { object_type: 'task', action: 'deleted' }
        ],
        status: 'active'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signatureKey: webhook.signature_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data?.event) {
        return { inputs: [] };
      }

      let event = data.event;

      return {
        inputs: [
          {
            eventAction: event.action || data.action || 'unknown',
            eventId: event.id || data.id || `${event.object_id}_${event.date_created}`,
            objectId: event.object_id || '',
            objectType: event.object_type || 'task',
            changedFields: event.changed_fields,
            currentData: event.data,
            userId: event.user_id,
            dateCreated: event.date_created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let currentData = ctx.input.currentData || {};

      return {
        type: `task.${ctx.input.eventAction}`,
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.objectId,
          action: ctx.input.eventAction,
          changedFields: ctx.input.changedFields,
          leadId: currentData.lead_id,
          text: currentData.text,
          assignedTo: currentData.assigned_to,
          isComplete: currentData.is_complete,
          dueDate: currentData.date,
          taskType: currentData._type,
          userId: ctx.input.userId,
          dateCreated: ctx.input.dateCreated
        }
      };
    }
  })
  .build();
