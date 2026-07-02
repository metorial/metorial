import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let opportunityEventsTrigger = SlateTrigger.create(spec, {
  name: 'Opportunity Events',
  key: 'opportunity_events',
  description: 'Triggers when an opportunity is created, updated, or deleted in Close.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action that occurred (created, updated, deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('ID of the affected opportunity'),
      objectType: z.string().describe('Object type (opportunity)'),
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
      opportunityId: z.string().describe('ID of the affected opportunity'),
      action: z.string().describe('The action that occurred'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed'),
      leadId: z.string().optional().describe('ID of the parent lead'),
      statusId: z.string().optional().describe('Current status ID'),
      statusLabel: z.string().optional().describe('Current status label'),
      statusType: z.string().optional().describe('Status type (active, won, lost)'),
      value: z.number().optional().describe('Opportunity value in cents'),
      valuePeriod: z.string().optional().describe('Value period (one_time, monthly, annual)'),
      confidence: z.number().optional().describe('Confidence percentage (0-100)'),
      pipelineId: z.string().optional().describe('Pipeline ID'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event occurred'),
      dateWon: z.string().optional().describe('Date the opportunity was won')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          { object_type: 'opportunity', action: 'created' },
          { object_type: 'opportunity', action: 'updated' },
          { object_type: 'opportunity', action: 'deleted' }
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
            objectType: event.object_type || 'opportunity',
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
        type: `opportunity.${ctx.input.eventAction}`,
        id: ctx.input.eventId,
        output: {
          opportunityId: ctx.input.objectId,
          action: ctx.input.eventAction,
          changedFields: ctx.input.changedFields,
          leadId: currentData.lead_id,
          statusId: currentData.status_id,
          statusLabel: currentData.status_label,
          statusType: currentData.status_type,
          value: currentData.value,
          valuePeriod: currentData.value_period,
          confidence: currentData.confidence,
          pipelineId: currentData.pipeline_id,
          userId: ctx.input.userId,
          dateCreated: ctx.input.dateCreated,
          dateWon: currentData.date_won
        }
      };
    }
  })
  .build();
