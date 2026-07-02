import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExchangeTransactions = SlateTool.create(spec, {
  name: 'Manage Exchange Transactions',
  key: 'manage_exchange_transactions',
  description: `Search and manage transactions on the Dripcel campaign exchange as a buyer. Search by transaction ID, status, offer ID, or creation date. Accept or reject pending transactions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['search', 'accept', 'reject'])
        .describe(
          'Action to perform: search for transactions, accept a pending transaction, or reject a pending transaction'
        ),
      transactionId: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Transaction ID(s) to search for or the transaction ID to accept/reject'),
      status: z
        .enum(['pending', 'completed', 'rejected'])
        .optional()
        .describe('Filter transactions by status (for search action)'),
      offerId: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Filter transactions by offer ID(s) (for search action)'),
      createdAfter: z
        .string()
        .optional()
        .describe(
          'Filter transactions created on or after this date (ISO 8601, for search action)'
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          'Filter transactions created on or before this date (ISO 8601, for search action)'
        )
    })
  )
  .output(
    z.object({
      transactions: z
        .array(z.any())
        .optional()
        .describe('Array of transaction objects (for search action)'),
      updated: z
        .boolean()
        .optional()
        .describe('Whether the transaction status was updated (for accept/reject actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'search') {
      let createdAt: { $gte?: string; $lte?: string } | undefined;
      if (ctx.input.createdAfter || ctx.input.createdBefore) {
        createdAt = {};
        if (ctx.input.createdAfter) createdAt.$gte = ctx.input.createdAfter;
        if (ctx.input.createdBefore) createdAt.$lte = ctx.input.createdBefore;
      }

      let result = await client.searchTransactions({
        transactionId: ctx.input.transactionId,
        status: ctx.input.status,
        offerId: ctx.input.offerId,
        createdAt
      });

      let transactions = Array.isArray(result.data) ? result.data : [];
      return {
        output: { transactions },
        message: `Found **${transactions.length}** transaction(s).`
      };
    }

    // accept or reject
    let txId = ctx.input.transactionId;
    if (!txId || Array.isArray(txId)) {
      throw new Error('A single transactionId is required for accept/reject actions');
    }

    let newStatus: 'completed' | 'rejected' =
      ctx.input.action === 'accept' ? 'completed' : 'rejected';
    await client.updateTransactionStatus(txId, newStatus);
    return {
      output: { updated: true },
      message: `Transaction \`${txId}\` has been **${ctx.input.action === 'accept' ? 'accepted' : 'rejected'}**.`
    };
  })
  .build();
