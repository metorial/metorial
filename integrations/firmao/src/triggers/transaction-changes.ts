import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let transactionChanges = SlateTrigger.create(spec, {
  name: 'Transaction Changes',
  key: 'transaction_changes',
  description:
    'Triggers when transactions (invoices, receipts, etc.) are created or modified in Firmao. Polls for recently modified transaction records.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      transactionId: z.number().describe('ID of the changed transaction'),
      raw: z.any().describe('Full transaction record from the API')
    })
  )
  .output(
    z.object({
      transactionId: z.number(),
      transactionNumber: z.string().optional(),
      type: z.string().optional(),
      mode: z.string().optional(),
      transactionDate: z.string().optional(),
      paymentDate: z.string().optional(),
      currency: z.string().optional(),
      paid: z.boolean().optional(),
      paidValue: z.number().optional(),
      netTotal: z.number().optional(),
      grossTotal: z.number().optional(),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      creationDate: z.string().optional(),
      lastModificationDate: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FirmaoClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filters: Record<string, string> = {};
      if (lastPollTime) {
        filters['lastModificationDate(gt)'] = lastPollTime;
      }

      let result = await client.list('transactions', {
        sort: 'lastModificationDate',
        dir: 'DESC',
        limit: 50,
        filters
      });

      let now = new Date().toISOString();

      let inputs = result.data.map((t: any) => {
        let isNew =
          !lastPollTime || (t.creationDate && t.creationDate === t.lastModificationDate);
        return {
          changeType: isNew ? ('created' as const) : ('updated' as const),
          transactionId: t.id,
          raw: t
        };
      });

      return {
        inputs,
        updatedState: {
          lastPollTime:
            result.data.length > 0
              ? (result.data[0].lastModificationDate ?? now)
              : (lastPollTime ?? now)
        }
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.raw;
      return {
        type: `transaction.${ctx.input.changeType}`,
        id: `transaction-${ctx.input.transactionId}-${t.lastModificationDate ?? Date.now()}`,
        output: {
          transactionId: ctx.input.transactionId,
          transactionNumber: t.transactionNumber,
          type: t.type,
          mode: t.mode,
          transactionDate: t.transactionDate,
          paymentDate: t.paymentDate,
          currency: t.currency,
          paid: t.paid,
          paidValue: t.paidValue,
          netTotal: t.transactionNettoPrice,
          grossTotal: t.transactionBruttoPrice,
          customerId: typeof t.customer === 'object' ? t.customer?.id : t.customer,
          customerName: typeof t.customer === 'object' ? t.customer?.name : undefined,
          creationDate: t.creationDate,
          lastModificationDate: t.lastModificationDate
        }
      };
    }
  })
  .build();
