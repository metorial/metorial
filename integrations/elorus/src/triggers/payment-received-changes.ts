import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let paymentReceivedChanges = SlateTrigger.create(spec, {
  name: 'Payment Received Changes',
  key: 'payment_received_changes',
  description:
    'Triggers when payments received (cash receipts) are created or modified in your Elorus organization. Covers client payments and income entries.'
})
  .input(
    z.object({
      cashReceiptId: z.string().describe('The cash receipt ID.'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the payment was newly created or updated.'),
      cashReceipt: z.any().describe('The full cash receipt object.')
    })
  )
  .output(
    z.object({
      cashReceiptId: z.string().describe('The cash receipt ID.'),
      contactId: z.string().optional().describe('Contact ID of the payer.'),
      contactName: z.string().optional().describe('Display name of the payer.'),
      amount: z.string().optional().describe('Payment amount.'),
      currencyCode: z.string().optional().describe('Currency code.'),
      date: z.string().optional().describe('Payment date.'),
      transactionType: z
        .string()
        .optional()
        .describe('Transaction type (dp=client payment, icm=income).'),
      title: z.string().optional().describe('Payment title/description.'),
      cashReceipt: z.any().describe('The full cash receipt object.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as string[]) || [];

      let params: any = {
        ordering: '-modified',
        pageSize: 50
      };

      if (lastPollTime) {
        params.modifiedAfter = lastPollTime;
      }

      let result = await client.listCashReceipts(params);
      let now = new Date().toISOString();

      let inputs = result.results.map((receipt: any) => ({
        cashReceiptId: receipt.id,
        eventType: (knownIds.includes(receipt.id) ? 'updated' : 'created') as
          | 'created'
          | 'updated',
        cashReceipt: receipt
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...result.results.map((r: any) => r.id)])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let r = ctx.input.cashReceipt;

      return {
        type: `cash_receipt.${ctx.input.eventType}`,
        id: `${r.id}-${r.modified || r.created || ctx.input.eventType}`,
        output: {
          cashReceiptId: r.id,
          contactId: r.contact,
          contactName: r.contact_display_name,
          amount: r.amount,
          currencyCode: r.currency_code,
          date: r.date,
          transactionType: r.transaction_type,
          title: r.title,
          cashReceipt: r
        }
      };
    }
  })
  .build();
