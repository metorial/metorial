import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transferCompleted = SlateTrigger.create(spec, {
  name: 'Transfer Completed',
  key: 'transfer_completed',
  description:
    'Triggered when a payout/transfer is completed. Includes transfer status, amount, recipient details, and bank information.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from webhook'),
      transferId: z.number().describe('Transfer ID'),
      accountNumber: z.string().optional().describe('Recipient account number'),
      bankName: z.string().optional().describe('Recipient bank name'),
      bankCode: z.string().optional().describe('Bank code'),
      fullName: z.string().optional().describe('Recipient name'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Transfer currency'),
      fee: z.number().optional().describe('Transfer fee'),
      status: z.string().describe('Transfer status'),
      reference: z.string().optional().describe('Transfer reference'),
      narration: z.string().optional().describe('Transfer narration'),
      completeMessage: z.string().optional().describe('Completion message from bank'),
      createdAt: z.string().optional().describe('Transfer timestamp')
    })
  )
  .output(
    z.object({
      transferId: z.number().describe('Transfer ID'),
      accountNumber: z.string().optional().describe('Recipient account number'),
      bankName: z.string().optional().describe('Recipient bank name'),
      bankCode: z.string().optional().describe('Bank code'),
      fullName: z.string().optional().describe('Recipient name'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Transfer currency'),
      fee: z.number().optional().describe('Transfer fee'),
      status: z.string().describe('Transfer status'),
      reference: z.string().optional().describe('Transfer reference'),
      narration: z.string().optional().describe('Transfer narration'),
      completeMessage: z.string().optional().describe('Completion message from bank'),
      createdAt: z.string().optional().describe('Transfer timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event !== 'transfer.completed') {
        return { inputs: [] };
      }

      let d = body.data || {};

      return {
        inputs: [
          {
            eventType: body.event,
            transferId: d.id,
            accountNumber: d.account_number,
            bankName: d.bank_name,
            bankCode: d.bank_code,
            fullName: d.full_name,
            amount: d.amount,
            currency: d.currency,
            fee: d.fee,
            status: d.status,
            reference: d.reference,
            narration: d.narration,
            completeMessage: d.complete_message,
            createdAt: d.created_at
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'transfer.completed',
        id: `transfer_${ctx.input.transferId}`,
        output: {
          transferId: ctx.input.transferId,
          accountNumber: ctx.input.accountNumber,
          bankName: ctx.input.bankName,
          bankCode: ctx.input.bankCode,
          fullName: ctx.input.fullName,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          fee: ctx.input.fee,
          status: ctx.input.status,
          reference: ctx.input.reference,
          narration: ctx.input.narration,
          completeMessage: ctx.input.completeMessage,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
