import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let actionTriggerEvents = [
  'TRIGGER_EVENT_ACTION_CREATED',
  'TRIGGER_EVENT_ACTION_UPDATED',
  'TRIGGER_EVENT_ACTION_TITLE_UPDATED',
  'TRIGGER_EVENT_ACTION_DESCRIPTION_UPDATED',
  'TRIGGER_EVENT_ACTION_DATE_DUE_UPDATED',
  'TRIGGER_EVENT_ACTION_STATUS_UPDATED',
  'TRIGGER_EVENT_ACTION_PRIORITY_UPDATED',
  'TRIGGER_EVENT_ACTION_COLLABORATORS_UPDATED',
  'TRIGGER_EVENT_ACTION_SITE_UPDATED',
  'TRIGGER_EVENT_ACTION_DELETED',
  'TRIGGER_EVENT_ACTION_ASSET_UPDATED',
  'TRIGGER_EVENT_ACTION_LABELS_UPDATED'
];

export let actionEvents = SlateTrigger.create(spec, {
  name: 'Action Events',
  key: 'action_events',
  description:
    'Triggers when corrective actions are created, updated, deleted, or when their properties change (status, priority, assignees, etc.).'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      eventTypes: z.array(z.string()).describe('Event types that triggered this event'),
      resourceId: z.string().describe('Action ID'),
      resourceType: z.string().describe('Resource type'),
      triggeredAt: z.string().describe('Timestamp of the event'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event-specific data')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('ID of the affected action'),
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
        triggerEvents: actionTriggerEvents
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

      return {
        inputs: [
          {
            webhookId: data.webhook_id || '',
            eventTypes: data.event?.event_types || [],
            resourceId: data.resource?.id || '',
            resourceType: data.resource?.type || '',
            triggeredAt: data.event?.date_triggered || new Date().toISOString(),
            triggeredByUserId: data.event?.triggered_by?.user,
            organisationId: data.event?.triggered_by?.organization,
            eventData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'action.updated';
      let types = ctx.input.eventTypes;

      if (types.includes('TRIGGER_EVENT_ACTION_CREATED')) {
        eventType = 'action.created';
      } else if (types.includes('TRIGGER_EVENT_ACTION_DELETED')) {
        eventType = 'action.deleted';
      } else if (types.includes('TRIGGER_EVENT_ACTION_STATUS_UPDATED')) {
        eventType = 'action.status_updated';
      } else if (types.includes('TRIGGER_EVENT_ACTION_PRIORITY_UPDATED')) {
        eventType = 'action.priority_updated';
      } else if (types.includes('TRIGGER_EVENT_ACTION_COLLABORATORS_UPDATED')) {
        eventType = 'action.assignees_updated';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${ctx.input.triggeredAt}`,
        output: {
          actionId: ctx.input.resourceId,
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
