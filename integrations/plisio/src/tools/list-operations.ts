import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let listOperations = SlateTool.create(spec, {
  name: 'List Operations',
  key: 'list_operations',
  description: `Retrieve transaction history including invoices, withdrawals, and internal transfers. Supports filtering by type, status, cryptocurrency, and search by transaction ID, order number, or email. Paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of results per page'),
      shopId: z.string().optional().describe('Filter by shop ID'),
      type: z
        .enum(['cash_in', 'cash_out', 'mass_cash_out', 'invoice'])
        .optional()
        .describe('Filter by operation type'),
      status: z
        .enum([
          'new',
          'pending',
          'pending internal',
          'expired',
          'completed',
          'mismatch',
          'error',
          'cancelled'
        ])
        .optional()
        .describe('Filter by operation status'),
      currency: z.string().optional().describe('Filter by cryptocurrency ID (e.g. BTC, ETH)'),
      search: z
        .string()
        .optional()
        .describe('Search by transaction ID, order number, or email')
    })
  )
  .output(
    z.object({
      operations: z
        .array(
          z.object({
            operationId: z.string().describe('Operation ID'),
            type: z.string().describe('Operation type'),
            status: z.string().describe('Current status'),
            currency: z.string().optional().describe('Cryptocurrency code'),
            amount: z.string().optional().describe('Operation amount'),
            fee: z.string().optional().describe('Transaction fee'),
            walletHash: z.string().optional().describe('Wallet address'),
            txUrl: z.string().optional().describe('Block explorer URL'),
            sourceCurrency: z.string().optional().describe('Fiat currency code'),
            sourceRate: z.string().optional().describe('Exchange rate')
          })
        )
        .describe('List of operations'),
      totalCount: z.number().optional().describe('Total number of matching operations'),
      pageCount: z.number().optional().describe('Total number of pages'),
      currentPage: z.number().optional().describe('Current page number'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.listOperations({
      page: ctx.input.page,
      limit: ctx.input.limit,
      shopId: ctx.input.shopId,
      type: ctx.input.type,
      status: ctx.input.status,
      currency: ctx.input.currency,
      search: ctx.input.search
    });

    let operations = (result.operations || []).map((op: any) => ({
      operationId: op.id,
      type: op.type,
      status: op.status,
      currency: op.currency ?? op.psys_cid,
      amount: op.amount,
      fee: op.fee,
      walletHash: op.wallet_hash,
      txUrl: op.tx_url,
      sourceCurrency: op.source_currency,
      sourceRate: op.source_rate
    }));

    let meta = result._meta || {};

    return {
      output: {
        operations,
        totalCount: meta.totalCount,
        pageCount: meta.pageCount,
        currentPage: meta.currentPage,
        perPage: meta.perPage
      },
      message: `Found **${meta.totalCount ?? operations.length}** operations (page ${meta.currentPage ?? 1} of ${meta.pageCount ?? 1}).`
    };
  })
  .build();
