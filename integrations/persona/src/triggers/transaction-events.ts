import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Receive webhook events for transaction lifecycle changes including creation, status updates, and redaction.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g., transaction.created, transaction.status-updated)'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().optional().describe('Transaction ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional().describe('Persona transaction ID'),
      status: z.string().optional().describe('Transaction status'),
      referenceId: z.string().optional().describe('Your reference ID'),
      accountId: z.string().optional().describe('Associated account ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full transaction attributes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        enabledEvents: [
          'transaction.created',
          'transaction.status-updated',
          'transaction.redacted'
        ]
      });

      return {
        registrationDetails: {
          webhookId: result.data?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PersonaClient({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (e: any) {
          if (e?.response?.status !== 404) throw e;
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.data) return { inputs: [] };

      let eventData = data.data;
      let n = normalizeResource(eventData);
      let eventType = n.name || n.event_type || 'unknown';

      if (!eventType.startsWith('transaction.')) return { inputs: [] };

      let payloadData = n.payload?.data || {};

      return {
        inputs: [
          {
            eventType,
            eventId: eventData.id || `${eventType}_${payloadData.id}_${Date.now()}`,
            resourceId: payloadData.id,
            payload: n.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payloadData = ctx.input.payload?.data || {};
      let payloadAttrs = payloadData.attributes || {};
      let relationships = payloadData.relationships || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          transactionId: payloadData.id || ctx.input.resourceId,
          status: payloadAttrs.status,
          referenceId: payloadAttrs['reference-id'] || payloadAttrs.reference_id,
          accountId: relationships.account?.data?.id,
          createdAt: payloadAttrs['created-at'] || payloadAttrs.created_at,
          attributes: payloadAttrs
        }
      };
    }
  })
  .build();
