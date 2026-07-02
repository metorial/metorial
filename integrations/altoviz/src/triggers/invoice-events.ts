import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description: 'Triggers when a sales invoice is created, updated, or deleted in Altoviz.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (InvoiceCreated, InvoiceUpdated, InvoiceDeleted)'),
      webhookId: z.string().describe('Webhook ID'),
      invoice: z.any().describe('Invoice entity data from the webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID'),
      number: z.string().nullable().optional().describe('Invoice number'),
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
        name: 'Slates Invoice Events',
        types: ['InvoiceCreated', 'InvoiceUpdated', 'InvoiceDeleted'],
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
            invoice: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let invoice = ctx.input.invoice || {};
      let eventTypeMap: Record<string, string> = {
        InvoiceCreated: 'invoice.created',
        InvoiceUpdated: 'invoice.updated',
        InvoiceDeleted: 'invoice.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `invoice.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.webhookId}-${invoice.id || 'unknown'}-${ctx.input.eventType}`,
        output: {
          invoiceId: invoice.id,
          number: invoice.number,
          date: invoice.date,
          customerNumber: invoice.customerNumber,
          customerName: invoice.customerName,
          taxExcludedAmount: invoice.taxExcludedAmount,
          taxAmount: invoice.taxAmount,
          taxIncludedAmount: invoice.taxIncludedAmount,
          status: invoice.status,
          internalId: invoice.internalId
        }
      };
    }
  })
  .build();
