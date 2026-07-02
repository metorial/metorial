import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

let customerEventTypes = [
  'customer.created',
  'customer.updated',
  'customer.archived'
] as const;

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description: 'Triggers when a customer is created, updated, or archived.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of customer event'),
      webhookId: z.string().describe('The webhook delivery ID'),
      customerId: z.string().describe('The affected customer ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('The customer ID'),
      name: z.string().optional().describe('Customer name'),
      email: z.string().optional().describe('Customer email'),
      discountPercentage: z.number().optional().describe('Default discount percentage'),
      depositType: z.string().optional().describe('Default deposit type'),
      archived: z.boolean().optional().describe('Whether the customer is archived'),
      createdAt: z.string().optional().describe('Customer creation timestamp'),
      updatedAt: z.string().optional().describe('Customer last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));

      let response = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: [...customerEventTypes],
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

      let eventType = data?.event || data?.type || 'customer.updated';
      let _customerData = data?.data?.attributes || data?.data || data?.customer || data;
      let customerId = data?.data?.id || data?.customer_id || data?.id || '';
      let webhookId = data?.webhook_id || data?.id || `${customerId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            webhookId: String(webhookId),
            customerId: String(customerId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs =
        ctx.input.payload?.data?.attributes ||
        ctx.input.payload?.customer ||
        ctx.input.payload ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          customerId: ctx.input.customerId,
          name: attrs.name,
          email: attrs.email,
          discountPercentage: attrs.discount_percentage,
          depositType: attrs.deposit_type,
          archived: attrs.archived,
          createdAt: attrs.created_at,
          updatedAt: attrs.updated_at
        }
      };
    }
  })
  .build();
