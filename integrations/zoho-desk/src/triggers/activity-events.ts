import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let activityEventTypes = [
  'Call_Add',
  'Call_Update',
  'Call_Delete',
  'Event_Add',
  'Event_Update',
  'Event_Delete',
  'TimeEntry_Add',
  'TimeEntry_Update',
  'TimeEntry_Delete',
  'Department_Add',
  'Department_Update'
] as const;

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity & Department Events',
  key: 'activity_events',
  description:
    'Triggered when calls, calendar events, time entries, or departments are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of activity event'),
      resourceId: z.string().describe('ID of the affected resource'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z
        .string()
        .describe('Type of resource (call, event, time_entry, department)'),
      subject: z.string().optional().describe('Subject or name of the resource'),
      status: z.string().optional().describe('Status of the resource'),
      departmentId: z.string().optional().describe('Department ID'),
      assigneeId: z.string().optional().describe('Assigned agent ID'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of activityEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType.includes('_Update')) {
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
      let resource = data.payload || data;
      let resourceId = resource.id || '';

      return {
        inputs: [
          {
            eventType,
            resourceId: String(resourceId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, resourceId, payload } = ctx.input;
      let resource = payload?.payload || payload || {};

      let resourceType = 'unknown';
      if (eventType.startsWith('Call_')) resourceType = 'call';
      else if (eventType.startsWith('Event_')) resourceType = 'event';
      else if (eventType.startsWith('TimeEntry_')) resourceType = 'time_entry';
      else if (eventType.startsWith('Department_')) resourceType = 'department';

      let normalizedType = eventType.replace(/_/g, '.').toLowerCase();

      return {
        type: normalizedType,
        id: `${resourceId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          resourceId,
          resourceType,
          subject: resource.subject || resource.name,
          status: resource.status,
          departmentId: resource.departmentId,
          assigneeId: resource.assigneeId,
          previousState: resource.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
