import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggers when a payment is created, updated, or paid.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z
        .string()
        .describe('Event type: payments.created, payments.updated, or payments.paid'),
      paymentNew: z.any().describe('New payment data'),
      paymentOld: z.any().nullable().describe('Previous payment data')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('UUID of the payment'),
      bookingId: z.string().describe('UUID of the related booking'),
      invoiceId: z.string().describe('UUID of the associated invoice'),
      amount: z.number().describe('Total payment amount'),
      paid: z.number().describe('Amount already paid'),
      currency: z.string().describe('Payment currency'),
      status: z.string().describe('Current payment status'),
      offline: z.boolean().describe('Whether this is an offline payment'),
      reference: z.string().describe('Payment reference'),
      dueAt: z.string().nullable().describe('Payment due date'),
      completedAt: z.string().nullable().describe('Completion timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['payments.created', 'payments.updated', 'payments.paid'],
        description: 'Slates: Payment Events'
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
            paymentNew: data.payload?.new ?? null,
            paymentOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payment = ctx.input.paymentNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          paymentId: payment.id,
          bookingId: payment.booking_id,
          invoiceId: payment.invoice_id,
          amount: payment.amount,
          paid: payment.paid,
          currency: payment.currency,
          status: payment.status,
          offline: payment.offline,
          reference: payment.reference,
          dueAt: payment.due_at ?? null,
          completedAt: payment.completed_at ?? null,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at
        }
      };
    }
  })
  .build();
