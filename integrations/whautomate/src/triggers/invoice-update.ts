import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invoiceUpdate = SlateTrigger.create(spec, {
  name: 'Invoice Update',
  key: 'invoice_update',
  description:
    'Triggered when an invoice is created or its status changes to draft, paid, pending, or sent.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      invoice: z.record(z.string(), z.any()).describe('Invoice payload from the webhook')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice number (e.g., INV-1001)'),
      status: z.string().optional().describe('Invoice status (Draft, Paid, Pending, Sent)'),
      clientId: z.string().optional().describe('Client ID'),
      clientName: z.string().optional().describe('Client full name'),
      clientPhone: z.string().optional().describe('Client phone number'),
      clientEmail: z.string().optional().describe('Client email'),
      staffId: z.string().optional().describe('Staff member ID'),
      staffName: z.string().optional().describe('Staff member name'),
      locationId: z.string().optional().describe('Location ID'),
      locationTitle: z.string().optional().describe('Location name'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Invoice due date'),
      currency: z.string().optional().describe('Currency code'),
      total: z.number().optional().describe('Total invoice amount'),
      pendingAmount: z.number().optional().describe('Pending amount'),
      items: z.array(z.record(z.string(), z.any())).optional().describe('Invoice line items'),
      invoicePdfUrl: z.string().optional().describe('URL to the invoice PDF'),
      internalNotes: z.string().optional().describe('Internal notes'),
      clientNotes: z.string().optional().describe('Client-facing notes'),
      createdAt: z.string().optional().describe('Invoice creation timestamp'),
      updatedAt: z.string().optional().describe('Invoice last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      let result = await client.createWebhook({
        serverUrl: ctx.input.webhookBaseUrl,
        eventTypes: ['invoice_updates'],
        isActive: true
      });

      return {
        registrationDetails: {
          webhookId: result.id || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let invoice = data.invoice || data;

      return {
        inputs: [
          {
            eventType: event.type || 'invoice_updates',
            eventId: event.id || invoice.id || invoice._id || crypto.randomUUID(),
            eventTimestamp: event.timeStamp || invoice.updatedAt || new Date().toISOString(),
            invoice
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.invoice;

      let statusLower = (inv.status || 'updated').toLowerCase();

      return {
        type: `invoice.${statusLower}`,
        id: ctx.input.eventId,
        output: {
          invoiceId: inv.id || inv._id || ctx.input.eventId,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          clientId: inv.client?.id,
          clientName: inv.client?.fullName,
          clientPhone: inv.client?.phone,
          clientEmail: inv.client?.email,
          staffId: inv.staff?.id,
          staffName: inv.staff?.name,
          locationId: inv.location?.id,
          locationTitle: inv.location?.title,
          date: inv.date,
          dueDate: inv.dueDate,
          currency: inv.currency,
          total: inv.total,
          pendingAmount: inv.pendingAmount,
          items: inv.items,
          invoicePdfUrl: inv.invoicePDF,
          internalNotes: inv.internalNotes,
          clientNotes: inv.clientNotes,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt
        }
      };
    }
  })
  .build();
