import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceEventTypes = ['NEW_INVOICE', 'INVOICE_UPDATED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_INVOICE: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated'
};

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description: 'Triggered when invoices are created or updated.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      invoice: z.any().describe('Invoice data from webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      number: z.string().optional(),
      clientId: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      currency: z.string().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of invoiceEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            invoice: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let invoice = ctx.input.invoice;
      let invoiceId = invoice.id || invoice.invoiceId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `invoice.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${invoiceId}_${invoice.changeDate || Date.now()}`,
        output: {
          invoiceId,
          number: invoice.number || undefined,
          clientId: invoice.clientId || undefined,
          status: invoice.status || undefined,
          total: invoice.total,
          currency: invoice.currency || undefined,
          workspaceId: invoice.workspaceId || undefined
        }
      };
    }
  })
  .build();
