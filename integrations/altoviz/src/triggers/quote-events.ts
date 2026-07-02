import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let quoteEvents = SlateTrigger.create(spec, {
  name: 'Quote Events',
  key: 'quote_events',
  description: 'Triggers when a sales quote is created, updated, or deleted in Altoviz.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (QuoteCreated, QuoteUpdated, QuoteDeleted)'),
      webhookId: z.string().describe('Webhook ID'),
      quote: z.any().describe('Quote entity data from the webhook payload')
    })
  )
  .output(
    z.object({
      quoteId: z.number().describe('Altoviz quote ID'),
      number: z.string().nullable().optional().describe('Quote number'),
      date: z.string().nullable().optional(),
      customerNumber: z.string().nullable().optional(),
      customerName: z.string().nullable().optional(),
      taxExcludedAmount: z.number().nullable().optional(),
      taxAmount: z.number().nullable().optional(),
      taxIncludedAmount: z.number().nullable().optional(),
      status: z.string().nullable().optional(),
      internalId: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        name: 'Slates Quote Events',
        types: ['QuoteCreated', 'QuoteUpdated', 'QuoteDeleted'],
        url: ctx.input.webhookBaseUrl
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      return {
        inputs: [
          {
            eventType: body.type,
            webhookId: String(body.id),
            quote: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let quote = ctx.input.quote || {};
      let eventTypeMap: Record<string, string> = {
        QuoteCreated: 'quote.created',
        QuoteUpdated: 'quote.updated',
        QuoteDeleted: 'quote.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `quote.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.webhookId}-${quote.id || 'unknown'}-${ctx.input.eventType}`,
        output: {
          quoteId: quote.id,
          number: quote.number,
          date: quote.date,
          customerNumber: quote.customerNumber,
          customerName: quote.customerName,
          taxExcludedAmount: quote.taxExcludedAmount,
          taxAmount: quote.taxAmount,
          taxIncludedAmount: quote.taxIncludedAmount,
          status: quote.status,
          internalId: quote.internalId
        }
      };
    }
  })
  .build();
