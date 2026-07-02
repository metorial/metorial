import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let issueTriggerEvents = [
  'TRIGGER_EVENT_INCIDENT_CREATED',
  'TRIGGER_EVENT_INCIDENT_UPDATED',
  'TRIGGER_EVENT_INCIDENT_TITLE_UPDATED',
  'TRIGGER_EVENT_INCIDENT_DESCRIPTION_UPDATED',
  'TRIGGER_EVENT_INCIDENT_DATE_DUE_UPDATED',
  'TRIGGER_EVENT_INCIDENT_STATUS_UPDATED',
  'TRIGGER_EVENT_INCIDENT_PRIORITY_UPDATED',
  'TRIGGER_EVENT_INCIDENT_COLLABORATORS_UPDATED',
  'TRIGGER_EVENT_INCIDENT_CATEGORY_UPDATED',
  'TRIGGER_EVENT_INCIDENT_SITE_UPDATED',
  'TRIGGER_EVENT_INCIDENT_DELETED'
];

export let issueEvents = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when issues (incidents) are created, updated, deleted, or when their properties change (status, priority, category, etc.).'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      eventTypes: z.array(z.string()).describe('Event types that triggered this event'),
      resourceId: z.string().describe('Issue ID'),
      resourceType: z.string().describe('Resource type'),
      triggeredAt: z.string().describe('Timestamp of the event'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event-specific data')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('ID of the affected issue'),
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
        triggerEvents: issueTriggerEvents
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
      let eventType = 'issue.updated';
      let types = ctx.input.eventTypes;

      if (types.includes('TRIGGER_EVENT_INCIDENT_CREATED')) {
        eventType = 'issue.created';
      } else if (types.includes('TRIGGER_EVENT_INCIDENT_DELETED')) {
        eventType = 'issue.deleted';
      } else if (types.includes('TRIGGER_EVENT_INCIDENT_STATUS_UPDATED')) {
        eventType = 'issue.status_updated';
      } else if (types.includes('TRIGGER_EVENT_INCIDENT_PRIORITY_UPDATED')) {
        eventType = 'issue.priority_updated';
      } else if (types.includes('TRIGGER_EVENT_INCIDENT_CATEGORY_UPDATED')) {
        eventType = 'issue.category_updated';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${ctx.input.triggeredAt}`,
        output: {
          issueId: ctx.input.resourceId,
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
