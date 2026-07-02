import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let INVOICE_EVENT_TYPES = [
  'INVOICING.INVOICE.CREATED',
  'INVOICING.INVOICE.UPDATED',
  'INVOICING.INVOICE.SCHEDULED',
  'INVOICING.INVOICE.PAID',
  'INVOICING.INVOICE.REFUNDED',
  'INVOICING.INVOICE.CANCELLED'
];

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers on invoice lifecycle events: created, updated, scheduled, paid, refunded, and cancelled.'
})
  .input(
    z.object({
      eventId: z.string().describe('PayPal webhook event ID'),
      eventType: z.string().describe('Event type'),
      resource: z.any().describe('Full event resource payload'),
      createTime: z.string().optional().describe('Event creation time')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('PayPal invoice ID'),
      status: z.string().optional().describe('Invoice status'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      totalAmount: z.string().optional().describe('Invoice total amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      resource: z.any().optional().describe('Full invoice resource')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: INVOICE_EVENT_TYPES
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            resource: data.resource,
            createTime: data.create_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};

      return {
        type: ctx.input.eventType.toLowerCase().replace(/\./g, '.'),
        id: ctx.input.eventId,
        output: {
          invoiceId: resource.id,
          status: resource.status,
          invoiceNumber: resource.detail?.invoice_number,
          recipientEmail: resource.primary_recipients?.[0]?.billing_info?.email_address,
          totalAmount: resource.amount?.value,
          currencyCode: resource.amount?.currency_code || resource.detail?.currency_code,
          resource
        }
      };
    }
  })
  .build();
