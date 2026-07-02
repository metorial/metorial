import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let conversionEvents = SlateTrigger.create(spec, {
  name: 'Conversion Events',
  key: 'conversion_events',
  description:
    'Triggers when a lead or sale conversion event is tracked. Fires for lead.created and sale.created events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of conversion event (lead.created or sale.created)'),
      eventId: z.string().describe('Unique event ID'),
      conversionData: z.any().describe('Conversion data from the webhook payload'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Name of the conversion event'),
      linkId: z.string().describe('ID of the attributed link'),
      shortLink: z.string().describe('Short link that drove the conversion'),
      clickId: z.string().describe('ID of the attributed click'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      customerExternalId: z.string().nullable().describe('External customer ID'),
      saleAmount: z.number().nullable().describe('Sale amount in cents (for sale events)'),
      saleCurrency: z.string().nullable().describe('Currency code (for sale events)'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates - Conversion Events',
        triggers: ['lead.created', 'sale.created']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id: string;
        event: string;
        createdAt: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: body.event,
            eventId: body.id,
            conversionData: body.data,
            timestamp: body.createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.conversionData;
      let link = data.link ?? {};
      let click = data.click ?? {};
      let customer = data.customer ?? {};
      let sale = data.sale ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventName: data.eventName ?? ctx.input.eventType,
          linkId: link.id ?? '',
          shortLink: link.shortLink ?? '',
          clickId: click.id ?? '',
          customerName: customer.name ?? null,
          customerEmail: customer.email ?? null,
          customerExternalId: customer.externalId ?? null,
          saleAmount: sale.amount ?? null,
          saleCurrency: sale.currency ?? null,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
