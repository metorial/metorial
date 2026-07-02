import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CmpClient } from '../lib/cmp-client';
import { spec } from '../spec';

export let cmpWebhook = SlateTrigger.create(spec, {
  name: 'CMP Webhook',
  key: 'cmp_webhook',
  description:
    'Receives webhook events from Optimizely Content Marketing Platform including task, campaign, library, publishing, work request, and calendar events.'
})
  .input(
    z.object({
      eventName: z.string().describe('CMP webhook event name'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      payload: z.any().describe('Full webhook event payload')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('CMP webhook event name'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      timestamp: z.string().optional().describe('When the event occurred'),
      actor: z.any().optional().describe('User who triggered the event'),
      resourceData: z.any().optional().describe('Resource data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CmpClient(ctx.auth.token);

      let allEvents = [
        'task.asset.added',
        'task.asset.removed',
        'task.asset.modified',
        'task.draft.added',
        'task.draft.removed',
        'task.workflow.substep.started',
        'task.workflow.substep.completed',
        'task.workflow.substep.skipped',
        'task.workflow.substep.assignee.changed',
        'task.workflow.substep.duedate.changed',
        'task.content.preview.requested',
        'campaign.created',
        'campaign.updated',
        'library.asset.added',
        'library.asset.updated',
        'library.asset.removed',
        'publishing.event.created',
        'publishing.event.updated',
        'work_request.created',
        'work_request.updated',
        'event.created',
        'event.updated'
      ];

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: allEvents
      });

      return {
        registrationDetails: {
          webhookId: webhook.id || webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CmpClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventName = data.event || data.event_name || data.type || 'unknown';
      let eventId = data.id || data.event_id || `${eventName}-${Date.now()}`;
      let resourceId = data.resource_id || data.data?.id || data.object?.id;
      let resourceType = data.resource_type || data.object_type;

      return {
        inputs: [
          {
            eventName,
            eventId: String(eventId),
            resourceId: resourceId ? String(resourceId) : undefined,
            resourceType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      return {
        type: ctx.input.eventName.toLowerCase().replace(/\s+/g, '.'),
        id: ctx.input.eventId,
        output: {
          eventName: ctx.input.eventName,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          timestamp: payload.timestamp || payload.created_at || payload.occurred_at,
          actor: payload.actor || payload.user || payload.triggered_by,
          resourceData: payload.data || payload.resource || payload.object
        }
      };
    }
  })
  .build();
