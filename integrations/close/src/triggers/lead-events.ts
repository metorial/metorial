import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let leadEventsTrigger = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description: 'Triggers when a lead is created, updated, or deleted in Close.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that occurred (created, updated, deleted, merged)'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('ID of the affected lead'),
      objectType: z.string().describe('Object type (lead)'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('Fields that changed during an update'),
      previousData: z.any().optional().describe('Previous data before the change'),
      currentData: z.any().optional().describe('Current data after the change'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event was created')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the affected lead'),
      action: z.string().describe('The action that occurred'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed'),
      leadName: z.string().optional().describe('Name of the lead'),
      statusId: z.string().optional().describe('Current status ID'),
      statusLabel: z.string().optional().describe('Current status label'),
      url: z.string().optional().describe('Lead URL'),
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
          { object_type: 'lead', action: 'created' },
          { object_type: 'lead', action: 'updated' },
          { object_type: 'lead', action: 'deleted' },
          { object_type: 'lead', action: 'merged' }
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
            objectType: event.object_type || 'lead',
            changedFields: event.changed_fields,
            previousData: event.previous_data,
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
        type: `lead.${ctx.input.eventAction}`,
        id: ctx.input.eventId,
        output: {
          leadId: ctx.input.objectId,
          action: ctx.input.eventAction,
          changedFields: ctx.input.changedFields,
          leadName: currentData.name || currentData.display_name,
          statusId: currentData.status_id,
          statusLabel: currentData.status_label,
          url: currentData.url,
          userId: ctx.input.userId,
          dateCreated: ctx.input.dateCreated
        }
      };
    }
  })
  .build();
