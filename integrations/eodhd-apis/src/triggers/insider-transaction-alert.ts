import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let insiderTransactionAlert = SlateTrigger.create(spec, {
  name: 'Insider Transaction Alert',
  key: 'insider_transaction_alert',
  description:
    'Triggers when new insider transactions (purchases or sales) are filed with the SEC. Monitors Form 4 filings for all US companies.'
})
  .input(
    z.object({
      transactionCode: z.string().describe('Ticker symbol'),
      transactionDate: z.string().describe('Transaction date'),
      ownerName: z.string().optional().nullable().describe('Insider name'),
      transactionType: z.string().optional().nullable().describe('P=Purchase, S=Sale'),
      transactionAmount: z.number().optional().nullable().describe('Number of shares'),
      transactionPrice: z.number().optional().nullable().describe('Price per share'),
      acquiredDisposed: z.string().optional().nullable().describe('A=Acquired, D=Disposed'),
      postTransactionShares: z.number().optional().nullable().describe('Shares held after'),
      secFilingLink: z.string().optional().nullable().describe('SEC filing link')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Ticker symbol'),
      transactionDate: z.string().describe('Date of the insider transaction'),
      insiderName: z.string().optional().nullable().describe('Name of the insider'),
      transactionType: z
        .string()
        .optional()
        .nullable()
        .describe('Transaction type: P=Purchase, S=Sale'),
      sharesTraded: z.number().optional().nullable().describe('Number of shares traded'),
      pricePerShare: z.number().optional().nullable().describe('Price per share'),
      acquiredOrDisposed: z
        .string()
        .optional()
        .nullable()
        .describe('Whether shares were acquired or disposed'),
      sharesAfterTransaction: z
        .number()
        .optional()
        .nullable()
        .describe('Total shares held after transaction'),
      secFilingLink: z.string().optional().nullable().describe('Link to SEC filing')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EodhdClient({ token: ctx.auth.token });

      let lastPolledDate = (ctx.state as { lastPolledDate?: string })?.lastPolledDate;
      let today = new Date().toISOString().split('T')[0]!;

      let transactions = await client.getInsiderTransactions({
        from: lastPolledDate || today,
        limit: 100
      });

      let transactionsList: Array<{
        code: string;
        date: string;
        transactionDate?: string | null;
        ownerName?: string | null;
        transactionCode?: string | null;
        transactionAmount?: number | null;
        transactionPrice?: number | null;
        transactionAcquiredDisposed?: string | null;
        postTransactionAmount?: number | null;
        secLink?: string | null;
      }> = Array.isArray(transactions) ? transactions : [];

      if (lastPolledDate) {
        transactionsList = transactionsList.filter(t => t.date > lastPolledDate);
      }

      let newestDate =
        transactionsList.length > 0
          ? transactionsList.reduce(
              (max, t) => (t.date > max ? t.date : max),
              transactionsList[0]!.date
            )
          : lastPolledDate || today;

      return {
        inputs: transactionsList.map(t => ({
          transactionCode: t.code,
          transactionDate: t.transactionDate || t.date,
          ownerName: t.ownerName,
          transactionType: t.transactionCode,
          transactionAmount: t.transactionAmount,
          transactionPrice: t.transactionPrice,
          acquiredDisposed: t.transactionAcquiredDisposed,
          postTransactionShares: t.postTransactionAmount,
          secFilingLink: t.secLink
        })),
        updatedState: {
          lastPolledDate: newestDate
        }
      };
    },

    handleEvent: async ctx => {
      let type =
        ctx.input.transactionType === 'P'
          ? 'insider_transaction.purchase'
          : 'insider_transaction.sale';

      return {
        type,
        id: `${ctx.input.transactionCode}-${ctx.input.transactionDate}-${ctx.input.ownerName || 'unknown'}`,
        output: {
          ticker: ctx.input.transactionCode,
          transactionDate: ctx.input.transactionDate,
          insiderName: ctx.input.ownerName,
          transactionType: ctx.input.transactionType,
          sharesTraded: ctx.input.transactionAmount,
          pricePerShare: ctx.input.transactionPrice,
          acquiredOrDisposed: ctx.input.acquiredDisposed,
          sharesAfterTransaction: ctx.input.postTransactionShares,
          secFilingLink: ctx.input.secFilingLink
        }
      };
    }
  })
  .build();
