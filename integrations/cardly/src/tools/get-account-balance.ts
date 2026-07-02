import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountBalance = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_account_balance',
  description: `Retrieve the current card credit balance and gift credit balance for your organisation. Optionally include recent credit transaction history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeCreditHistory: z
        .boolean()
        .optional()
        .describe('If true, also return recent credit transaction history'),
      includeGiftCreditHistory: z
        .boolean()
        .optional()
        .describe('If true, also return recent gift credit transaction history'),
      historyLimit: z
        .number()
        .optional()
        .describe('Number of history records to include (default 25)')
    })
  )
  .output(
    z.object({
      cardCreditBalance: z.number().describe('Current card credit balance'),
      giftCreditBalance: z.number().describe('Current gift credit balance'),
      giftCreditCurrency: z.string().describe('Currency of gift credit balance'),
      creditHistory: z
        .array(
          z.object({
            recordId: z.string().describe('Transaction record ID'),
            orderId: z.string().optional().describe('Related order ID'),
            transactionId: z.string().optional().describe('Transaction ID'),
            type: z.string().describe('Transaction type'),
            typeCode: z.string().describe('Transaction type code'),
            change: z.number().describe('Credit change amount'),
            newBalance: z.number().describe('Balance after this transaction'),
            effectiveTime: z.string().describe('When the transaction took effect'),
            notes: z.string().optional().describe('Transaction notes')
          })
        )
        .optional()
        .describe('Recent credit transaction history'),
      giftCreditHistory: z
        .array(
          z.object({
            recordId: z.string().describe('Transaction record ID'),
            orderId: z.string().optional().describe('Related order ID'),
            transactionId: z.string().optional().describe('Transaction ID'),
            type: z.string().describe('Transaction type'),
            typeCode: z.string().describe('Transaction type code'),
            change: z.number().describe('Credit change amount'),
            newBalance: z.number().describe('Balance after this transaction'),
            effectiveTime: z.string().describe('When the transaction took effect'),
            notes: z.string().optional().describe('Transaction notes')
          })
        )
        .optional()
        .describe('Recent gift credit transaction history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let balance = await client.getBalance();

    let mapHistory = (records: Record<string, unknown>[]) =>
      records.map(r => ({
        recordId: r.id as string,
        orderId: r.orderId as string | undefined,
        transactionId: r.transactionId as string | undefined,
        type: r.type as string,
        typeCode: r.typeCode as string,
        change: r.change as number,
        newBalance: r.newBalance as number,
        effectiveTime: r.effectiveTime as string,
        notes: r.notes as string | undefined
      }));

    let creditHistory: ReturnType<typeof mapHistory> | undefined;
    let giftCreditHistory: ReturnType<typeof mapHistory> | undefined;

    if (ctx.input.includeCreditHistory) {
      let result = await client.listCreditHistory({ limit: ctx.input.historyLimit });
      creditHistory = mapHistory(result.records as unknown as Record<string, unknown>[]);
    }

    if (ctx.input.includeGiftCreditHistory) {
      let result = await client.listGiftCreditHistory({ limit: ctx.input.historyLimit });
      giftCreditHistory = mapHistory(result.records as unknown as Record<string, unknown>[]);
    }

    return {
      output: {
        cardCreditBalance: balance.balance,
        giftCreditBalance: balance.giftCredit.balance,
        giftCreditCurrency: balance.giftCredit.currency,
        creditHistory,
        giftCreditHistory
      },
      message: `Card credits: **${balance.balance}** | Gift credits: **${balance.giftCredit.balance} ${balance.giftCredit.currency}**`
    };
  })
  .build();
