import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string().describe('Unique transaction identifier'),
  accountId: z.string().describe('Account the transaction belongs to'),
  amount: z
    .number()
    .describe(
      'Transaction amount. Positive = money leaving account, negative = money entering.'
    ),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  name: z.string().describe('Transaction description or merchant name'),
  merchantName: z.string().nullable().optional().describe('Cleaned merchant name'),
  pending: z.boolean().describe('Whether the transaction is still pending'),
  paymentChannel: z
    .string()
    .optional()
    .describe('Payment channel: in store, online, or other'),
  category: z.string().nullable().optional().describe('Primary personal finance category'),
  categoryDetailed: z
    .string()
    .nullable()
    .optional()
    .describe('Detailed personal finance category'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code'),
  location: z
    .object({
      city: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      country: z.string().nullable().optional()
    })
    .optional()
    .describe('Transaction location')
});

export let syncTransactionsTool = SlateTool.create(spec, {
  name: 'Sync Transactions',
  key: 'sync_transactions',
  description: `Incrementally sync transaction data using Plaid's cursor-based approach. On the first call, omit the cursor to get the initial set of transactions. On subsequent calls, pass the **nextCursor** from the previous response to get only new changes (added, modified, removed). Continue calling while **hasMore** is true to get all available updates.`,
  instructions: [
    'On first call, omit the cursor parameter to begin a fresh sync.',
    'Store the returned nextCursor and pass it on subsequent calls to get incremental updates.',
    'Keep calling while hasMore is true to retrieve all pending changes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous sync response. Omit for initial sync.'),
      count: z
        .number()
        .optional()
        .describe('Max number of transactions to return per page (default 100, max 500)')
    })
  )
  .output(
    z.object({
      added: z.array(transactionSchema).describe('Newly added transactions'),
      modified: z.array(transactionSchema).describe('Modified transactions'),
      removed: z.array(z.string()).describe('IDs of removed transactions'),
      hasMore: z.boolean().describe('Whether more updates are available'),
      nextCursor: z.string().describe('Cursor to use for the next sync call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.syncTransactions(
      ctx.input.accessToken,
      ctx.input.cursor,
      ctx.input.count
    );

    let mapTxn = (t: any) => ({
      transactionId: t.transaction_id,
      accountId: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchantName: t.merchant_name ?? null,
      pending: t.pending,
      paymentChannel: t.payment_channel,
      category: t.personal_finance_category?.primary ?? null,
      categoryDetailed: t.personal_finance_category?.detailed ?? null,
      isoCurrencyCode: t.iso_currency_code ?? null,
      location: t.location
        ? {
            city: t.location.city ?? null,
            region: t.location.region ?? null,
            country: t.location.country ?? null
          }
        : undefined
    });

    let added = (result.added || []).map(mapTxn);
    let modified = (result.modified || []).map(mapTxn);
    let removed = (result.removed || []).map((r: any) => r.transaction_id);

    return {
      output: {
        added,
        modified,
        removed,
        hasMore: result.has_more,
        nextCursor: result.next_cursor
      },
      message: `Synced **${added.length}** added, **${modified.length}** modified, **${removed.length}** removed transactions. ${result.has_more ? 'More updates available.' : 'All caught up.'}`
    };
  })
  .build();
