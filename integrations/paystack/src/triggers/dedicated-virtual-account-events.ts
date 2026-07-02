import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let dedicatedVirtualAccountEvents = SlateTrigger.create(spec, {
  name: 'Dedicated Virtual Account Events',
  key: 'dedicated_virtual_account_events',
  description:
    'Triggers when a dedicated virtual account assignment succeeds or fails, and when a bank transfer is rejected.'
})
  .input(
    z.object({
      eventType: z.string().describe('Paystack event type'),
      eventId: z.string().describe('Unique event identifier'),
      accountName: z.string().describe('Virtual account name'),
      accountNumber: z.string().describe('Virtual account number'),
      bankName: z.string().describe('Bank name'),
      customerCode: z.string().describe('Customer code'),
      customerEmail: z.string().describe('Customer email'),
      assignmentStatus: z.string().describe('Assignment status (success, failed, rejected)')
    })
  )
  .output(
    z.object({
      accountName: z.string().describe('Virtual account name'),
      accountNumber: z.string().describe('Virtual account number'),
      bankName: z.string().describe('Bank name'),
      customerCode: z.string().describe('Customer code'),
      customerEmail: z.string().describe('Customer email'),
      assignmentStatus: z.string().describe('Assignment status')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let event = body.event as string;

      if (!event.startsWith('dedicatedaccount.') && event !== 'bank.transfer.rejected') {
        return { inputs: [] };
      }

      let data = body.data;
      let customer = data.customer ?? {};
      let dedicatedAccount = data.dedicated_account ?? data;

      let status = 'unknown';
      if (event === 'dedicatedaccount.assign.success') status = 'success';
      else if (event === 'dedicatedaccount.assign.failed') status = 'failed';
      else if (event === 'bank.transfer.rejected') status = 'rejected';

      return {
        inputs: [
          {
            eventType: event,
            eventId: `${event}_${dedicatedAccount.account_number ?? data.id}_${Date.now()}`,
            accountName: dedicatedAccount.account_name ?? '',
            accountNumber: dedicatedAccount.account_number ?? '',
            bankName: dedicatedAccount.bank?.name ?? '',
            customerCode: customer.customer_code ?? '',
            customerEmail: customer.email ?? '',
            assignmentStatus: status
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'dedicatedaccount.assign.success': 'dedicated_virtual_account.assigned',
        'dedicatedaccount.assign.failed': 'dedicated_virtual_account.assignment_failed',
        'bank.transfer.rejected': 'dedicated_virtual_account.transfer_rejected'
      };

      return {
        type:
          typeMap[ctx.input.eventType] ??
          `dedicated_virtual_account.${ctx.input.assignmentStatus}`,
        id: ctx.input.eventId,
        output: {
          accountName: ctx.input.accountName,
          accountNumber: ctx.input.accountNumber,
          bankName: ctx.input.bankName,
          customerCode: ctx.input.customerCode,
          customerEmail: ctx.input.customerEmail,
          assignmentStatus: ctx.input.assignmentStatus
        }
      };
    }
  })
  .build();
