import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description: 'Triggers on invoice lifecycle events: created, updated, or payment failed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      invoiceCode: z.string().describe('Invoice/payment request code'),
      amount: z.number().describe('Invoice amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Invoice status'),
      description: z.string().nullable().describe('Invoice description'),
      customerEmail: z.string().describe('Customer email'),
      dueDate: z.string().nullable().describe('Due date')
    })
  )
  .output(
    z.object({
      invoiceCode: z.string().describe('Invoice/payment request code'),
      amount: z.number().describe('Invoice amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Invoice status'),
      description: z.string().nullable().describe('Invoice description'),
      customerEmail: z.string().describe('Customer email'),
      dueDate: z.string().nullable().describe('Due date')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('invoice.') && !event.startsWith('paymentrequest.')) {
        return { inputs: [] };
      }

      let inv = body.data;
      let customer = inv.customer ?? {};

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${inv.request_code ?? inv.id}_${Date.now()}`,
            invoiceCode: inv.request_code ?? String(inv.id ?? ''),
            amount: inv.amount ?? 0,
            currency: inv.currency ?? '',
            status: inv.status ?? '',
            description: inv.description ?? null,
            customerEmail: customer.email ?? '',
            dueDate: inv.due_date ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'invoice.create': 'invoice.created',
        'invoice.update': 'invoice.updated',
        'invoice.payment_failed': 'invoice.payment_failed',
        'paymentrequest.pending': 'payment_request.pending',
        'paymentrequest.success': 'payment_request.successful'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          invoiceCode: ctx.input.invoiceCode,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          status: ctx.input.status,
          description: ctx.input.description,
          customerEmail: ctx.input.customerEmail,
          dueDate: ctx.input.dueDate
        }
      };
    }
  })
  .build();
