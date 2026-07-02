import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inspectionTriggerEvents = [
  'TRIGGER_EVENT_INSPECTION_HAS_STARTED',
  'TRIGGER_EVENT_INSPECTION_COMPLETED_STATUS',
  'TRIGGER_EVENT_INSPECTION_ITEM_UPDATED',
  'TRIGGER_EVENT_INSPECTION_ARCHIVED_STATUS',
  'TRIGGER_EVENT_INSPECTION_DELETED_STATUS',
  'TRIGGER_EVENT_INSPECTION_OWNER',
  'TRIGGER_EVENT_INSPECTION_ACCESS',
  'TRIGGER_EVENT_INSPECTION_LOCATION',
  'TRIGGER_EVENT_INSPECTION_DURATION',
  'TRIGGER_EVENT_INSPECTION_CLONED'
];

export let inspectionEvents = SlateTrigger.create(spec, {
  name: 'Inspection Events',
  key: 'inspection_events',
  description:
    'Triggers when inspections are started, completed, updated, archived, deleted, cloned, or when inspection items change.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      eventTypes: z.array(z.string()).describe('Event types that triggered this event'),
      resourceId: z.string().describe('Inspection ID'),
      resourceType: z.string().describe('Resource type'),
      triggeredAt: z.string().describe('Timestamp of the event'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event-specific data')
    })
  )
  .output(
    z.object({
      inspectionId: z.string().describe('ID of the affected inspection'),
      eventTypes: z.array(z.string()).describe('Event types'),
      triggeredAt: z.string().describe('When the event occurred'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      resourceType: z.string().optional().describe('Resource type'),
      eventData: z.any().optional().describe('Additional event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggerEvents: inspectionTriggerEvents
      });

      return {
        registrationDetails: {
          webhookId: result.webhook_id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventTypes = data.event?.event_types || [];
      let resourceId = data.resource?.id || '';
      let resourceType = data.resource?.type || '';

      return {
        inputs: [
          {
            webhookId: data.webhook_id || '',
            eventTypes,
            resourceId,
            resourceType,
            triggeredAt: data.event?.date_triggered || new Date().toISOString(),
            triggeredByUserId: data.event?.triggered_by?.user,
            organisationId: data.event?.triggered_by?.organization,
            eventData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'inspection.updated';
      let types = ctx.input.eventTypes;

      if (types.includes('TRIGGER_EVENT_INSPECTION_HAS_STARTED')) {
        eventType = 'inspection.started';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_COMPLETED_STATUS')) {
        eventType = 'inspection.completed';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_ARCHIVED_STATUS')) {
        eventType = 'inspection.archived';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_DELETED_STATUS')) {
        eventType = 'inspection.deleted';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_CLONED')) {
        eventType = 'inspection.cloned';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_ITEM_UPDATED')) {
        eventType = 'inspection.item_updated';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_OWNER')) {
        eventType = 'inspection.owner_changed';
      } else if (types.includes('TRIGGER_EVENT_INSPECTION_ACCESS')) {
        eventType = 'inspection.access_changed';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${ctx.input.triggeredAt}`,
        output: {
          inspectionId: ctx.input.resourceId,
          eventTypes: ctx.input.eventTypes,
          triggeredAt: ctx.input.triggeredAt,
          triggeredByUserId: ctx.input.triggeredByUserId,
          organisationId: ctx.input.organisationId,
          resourceType: ctx.input.resourceType,
          eventData: ctx.input.eventData
        }
      };
    }
  })
  .build();
