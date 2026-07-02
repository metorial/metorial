import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transferEvents = SlateTrigger.create(spec, {
  name: 'Transfer Events',
  key: 'transfer_events',
  description: 'Triggers when an outbound transfer succeeds, fails, or is reversed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      transferCode: z.string().describe('Transfer code'),
      reference: z.string().describe('Transfer reference'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Transfer status'),
      reason: z.string().nullable().describe('Transfer reason'),
      recipientCode: z.string().describe('Recipient code'),
      recipientName: z.string().describe('Recipient name'),
      recipientAccountNumber: z.string().describe('Recipient account number'),
      recipientBankName: z.string().describe('Recipient bank name')
    })
  )
  .output(
    z.object({
      transferCode: z.string().describe('Transfer code'),
      reference: z.string().describe('Transfer reference'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Transfer status'),
      reason: z.string().nullable().describe('Transfer reason'),
      recipientCode: z.string().describe('Recipient code'),
      recipientName: z.string().describe('Recipient name'),
      recipientAccountNumber: z.string().describe('Recipient account number'),
      recipientBankName: z.string().describe('Recipient bank name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('transfer.')) {
        return { inputs: [] };
      }

      let transfer = body.data;
      let recipient = transfer.recipient ?? {};

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${transfer.transfer_code}_${transfer.reference}`,
            transferCode: transfer.transfer_code,
            reference: transfer.reference,
            amount: transfer.amount,
            currency: transfer.currency,
            status: transfer.status,
            reason: transfer.reason ?? null,
            recipientCode: recipient.recipient_code ?? '',
            recipientName: recipient.name ?? '',
            recipientAccountNumber: recipient.details?.account_number ?? '',
            recipientBankName: recipient.details?.bank_name ?? ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'transfer.success': 'transfer.successful',
        'transfer.failed': 'transfer.failed',
        'transfer.reversed': 'transfer.reversed'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `transfer.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          transferCode: ctx.input.transferCode,
          reference: ctx.input.reference,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          status: ctx.input.status,
          reason: ctx.input.reason,
          recipientCode: ctx.input.recipientCode,
          recipientName: ctx.input.recipientName,
          recipientAccountNumber: ctx.input.recipientAccountNumber,
          recipientBankName: ctx.input.recipientBankName
        }
      };
    }
  })
  .build();
