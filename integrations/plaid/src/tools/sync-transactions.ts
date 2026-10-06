import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import type { transaction } from '../lib/contracts';
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
  categoryVersion: z
    .enum(['v1', 'v2'])
    .optional()
    .describe('Provider category taxonomy version'),
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
  description: `Retrieve one page of transaction changes. Continue while hasMore is true, retaining the original cursor for the whole batch. Commit the final nextCursor only after all pages succeed. An empty initial response may mean data is not ready; check transactionsUpdateStatus.`,
  instructions: [
    'On first call, omit the cursor parameter to begin a fresh sync.',
    'Use nextCursor to continue each page; persist it only after the complete batch succeeds.',
    'On TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION, discard the partial batch and restart from its original cursor.',
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
      count: z.number().optional().describe('Integer page size from 1 to 500 (default 100)'),
      personalFinanceCategoryVersion: z
        .enum(['v1', 'v2'])
        .optional()
        .describe('Requested category taxonomy, subject to account eligibility')
    })
  )
  .output(
    z.object({
      added: z.array(transactionSchema).describe('Newly added transactions'),
      modified: z.array(transactionSchema).describe('Modified transactions'),
      removed: z.array(z.string()).describe('IDs of removed transactions'),
      hasMore: z.boolean().describe('Whether more updates are available'),
      nextCursor: z
        .string()
        .describe('Page continuation; persist only after the full batch succeeds'),
      transactionsUpdateStatus: z
        .string()
        .optional()
        .describe(
          'Provider readiness: unknown, not ready, initial or historical update complete'
        ),
      returnedCount: z.number().optional().describe('Total changes returned on this page')
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
      ctx.input.count,
      ctx.input.personalFinanceCategoryVersion
    );

    let mapTxn = (t: z.infer<typeof transaction>) => ({
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
      categoryVersion: t.personal_finance_category?.version,
      location: t.location
        ? {
            city: t.location.city ?? null,
            region: t.location.region ?? null,
            country: t.location.country ?? null
          }
        : undefined
    });

    let added = result.added.map(mapTxn);
    let modified = result.modified.map(mapTxn);
    let removed = result.removed.map(r => r.transaction_id);

    return {
      output: {
        added,
        modified,
        removed,
        hasMore: result.has_more,
        nextCursor: result.next_cursor,
        transactionsUpdateStatus: result.transactions_update_status,
        returnedCount: added.length + modified.length + removed.length
      },
      message: `Synced **${added.length}** added, **${modified.length}** modified, **${removed.length}** removed transactions. ${result.has_more ? 'More pages are available; the batch is incomplete.' : `Batch complete; readiness: ${result.transactions_update_status}.`}`
    };
  })
  .build();
