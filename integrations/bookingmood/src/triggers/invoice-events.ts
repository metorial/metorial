import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description: 'Triggers when an invoice is created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: invoices.created or invoices.updated'),
      invoiceNew: z.any().describe('New invoice data'),
      invoiceOld: z.any().nullable().describe('Previous invoice data')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('UUID of the invoice'),
      bookingId: z.string().nullable().describe('UUID of the associated booking'),
      organizationId: z.string().describe('UUID of the organization'),
      reference: z.string().describe('Invoice reference'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['invoices.created', 'invoices.updated'],
        description: 'Slates: Invoice Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            invoiceNew: data.payload?.new ?? null,
            invoiceOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let invoice = ctx.input.invoiceNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          invoiceId: invoice.id,
          bookingId: invoice.booking_id ?? null,
          organizationId: invoice.organization_id,
          reference: invoice.reference,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at
        }
      };
    }
  })
  .build();
