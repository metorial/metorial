import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let disputeEvents = SlateTrigger.create(spec, {
  name: 'Dispute Events',
  key: 'dispute_events',
  description: 'Triggers on dispute lifecycle events: created, reminder, or resolved.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      disputeId: z.number().describe('Dispute ID'),
      status: z.string().describe('Dispute status'),
      amount: z.number().describe('Disputed amount'),
      currency: z.string().describe('Currency'),
      transactionReference: z.string().describe('Transaction reference'),
      category: z.string().nullable().describe('Dispute category'),
      dueDate: z.string().nullable().describe('Response due date')
    })
  )
  .output(
    z.object({
      disputeId: z.number().describe('Dispute ID'),
      status: z.string().describe('Dispute status'),
      amount: z.number().describe('Disputed amount'),
      currency: z.string().describe('Currency'),
      transactionReference: z.string().describe('Transaction reference'),
      category: z.string().nullable().describe('Dispute category'),
      dueDate: z.string().nullable().describe('Response due date')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('dispute.')) {
        return { inputs: [] };
      }

      let dispute = body.data;

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${dispute.id}_${Date.now()}`,
            disputeId: dispute.id,
            status: dispute.status ?? '',
            amount: dispute.amount ?? 0,
            currency: dispute.currency ?? '',
            transactionReference: dispute.transaction?.reference ?? '',
            category: dispute.category ?? null,
            dueDate: dispute.due_date ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'dispute.create': 'dispute.created',
        'dispute.reminder': 'dispute.reminder',
        'dispute.resolve': 'dispute.resolved'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `dispute.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          disputeId: ctx.input.disputeId,
          status: ctx.input.status,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          transactionReference: ctx.input.transactionReference,
          category: ctx.input.category,
          dueDate: ctx.input.dueDate
        }
      };
    }
  })
  .build();
