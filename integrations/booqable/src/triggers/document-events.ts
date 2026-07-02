import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

let documentEventTypes = [
  'invoice.created',
  'invoice.updated',
  'invoice.finalized',
  'invoice.revised',
  'invoice.archived',
  'quote.created',
  'quote.updated',
  'quote.confirmed',
  'quote.signed',
  'quote.archived',
  'contract.created',
  'contract.updated',
  'contract.confirmed',
  'contract.signed',
  'contract.archived'
] as const;

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when an invoice, quote, or contract is created, updated, finalized, confirmed, signed, revised, or archived.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of document event'),
      webhookId: z.string().describe('The webhook delivery ID'),
      documentId: z.string().describe('The affected document ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('The document ID'),
      documentType: z
        .string()
        .optional()
        .describe('Type of document (invoice, quote, contract)'),
      documentNumber: z.string().optional().describe('Document number'),
      orderId: z.string().optional().describe('Associated order ID'),
      status: z.string().optional().describe('Document status'),
      totalInCents: z.number().optional().describe('Document total in cents'),
      archived: z.boolean().optional().describe('Whether the document is archived'),
      createdAt: z.string().optional().describe('Document creation timestamp'),
      updatedAt: z.string().optional().describe('Document last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));

      let response = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: [...documentEventTypes],
        version: 4
      });

      let endpointId = response?.data?.id;

      return {
        registrationDetails: {
          webhookEndpointId: endpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));
      let endpointId = ctx.input.registrationDetails?.webhookEndpointId;
      if (endpointId) {
        await client.deleteWebhookEndpoint(endpointId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.event || data?.type || 'invoice.updated';
      let documentId = data?.data?.id || data?.document_id || data?.id || '';
      let webhookId = data?.webhook_id || data?.id || `${documentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            webhookId: String(webhookId),
            documentId: String(documentId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs =
        ctx.input.payload?.data?.attributes ||
        ctx.input.payload?.document ||
        ctx.input.payload ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          documentId: ctx.input.documentId,
          documentType: attrs.document_type,
          documentNumber: attrs.number ? String(attrs.number) : undefined,
          orderId: attrs.order_id,
          status: attrs.status,
          totalInCents: attrs.grand_total_in_cents || attrs.total_in_cents,
          archived: attrs.archived,
          createdAt: attrs.created_at,
          updatedAt: attrs.updated_at
        }
      };
    }
  })
  .build();
