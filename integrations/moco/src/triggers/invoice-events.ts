import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers when an invoice is created, updated, or deleted. Also fires on status changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      invoiceId: z.number().describe('Invoice ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Invoice ID'),
      title: z.string().optional().describe('Invoice title'),
      identifier: z.string().optional().describe('Invoice number'),
      status: z.string().optional().describe('Invoice status'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date'),
      currency: z.string().optional().describe('Currency code'),
      netTotal: z.number().optional().describe('Net total'),
      grossTotal: z.number().optional().describe('Gross total'),
      customerId: z.number().optional().describe('Customer company ID'),
      customerName: z.string().optional().describe('Customer company name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Invoice',
          event,
          hook: ctx.input.webhookBaseUrl
        });
        registrations.push({ webhookId: webhook.id, event });
      }

      return { registrationDetails: { webhooks: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number }>;
      };

      for (let reg of details.webhooks) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = ctx.request.headers.get('X-Moco-Event') || 'update';
      let timestamp = ctx.request.headers.get('X-Moco-Timestamp') || new Date().toISOString();
      let userId = ctx.request.headers.get('X-Moco-User-Id');

      return {
        inputs: [
          {
            eventType: event,
            invoiceId: body.id,
            timestamp,
            userId: userId ? Number(userId) : undefined,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: `invoice.${ctx.input.eventType}`,
        id: `invoice-${ctx.input.invoiceId}-${ctx.input.timestamp}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          title: p?.title,
          identifier: p?.identifier,
          status: p?.status,
          date: p?.date,
          dueDate: p?.due_date,
          currency: p?.currency,
          netTotal: p?.net_total,
          grossTotal: p?.gross_total,
          customerId: p?.customer?.id,
          customerName: p?.customer?.name
        }
      };
    }
  })
  .build();
