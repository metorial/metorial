import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description: 'Triggers when an invoice is viewed by a client or paid in Bonsai.'
})
  .input(
    z.object({
      eventType: z.enum(['viewed', 'paid']).describe('Type of invoice event'),
      invoiceId: z.string().describe('ID of the invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      clientName: z.string().optional().describe('Client name'),
      clientEmail: z.string().optional().describe('Client email'),
      amount: z.number().optional().describe('Invoice amount'),
      currency: z.string().optional().describe('Currency code'),
      dueDate: z.string().optional().describe('Invoice due date'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      clientName: z.string().optional().describe('Client name'),
      clientEmail: z.string().optional().describe('Client email'),
      amount: z.number().optional().describe('Invoice amount'),
      currency: z.string().optional().describe('Currency code'),
      dueDate: z.string().optional().describe('Invoice due date'),
      eventTimestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type ?? data.eventType ?? data.type ?? '';
      let normalizedType: 'viewed' | 'paid' = 'viewed';
      if (eventType.includes('paid') || eventType.includes('pay')) {
        normalizedType = 'paid';
      }

      let invoice = data.invoice ?? data.resource ?? data;

      return {
        inputs: [
          {
            eventType: normalizedType,
            invoiceId: invoice.id ?? invoice.invoice_id ?? data.id ?? '',
            invoiceNumber:
              invoice.invoice_number ?? invoice.invoiceNumber ?? invoice.number ?? undefined,
            clientName:
              invoice.client_name ?? invoice.clientName ?? data.client_name ?? undefined,
            clientEmail:
              invoice.client_email ?? invoice.clientEmail ?? data.client_email ?? undefined,
            amount: invoice.amount ?? invoice.total ?? undefined,
            currency: invoice.currency ?? undefined,
            dueDate: invoice.due_date ?? invoice.dueDate ?? undefined,
            timestamp: data.timestamp ?? data.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `invoice.${ctx.input.eventType}`,
        id: `invoice-${ctx.input.invoiceId}-${ctx.input.eventType}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          invoiceId: ctx.input.invoiceId,
          invoiceNumber: ctx.input.invoiceNumber,
          clientName: ctx.input.clientName,
          clientEmail: ctx.input.clientEmail,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          dueDate: ctx.input.dueDate,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
