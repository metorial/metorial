import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve card transactions from Ramp. Supports filtering by date range, merchant, user, sync status, and more. Returns paginated results with transaction details including amount, merchant, category, and card information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (2-100, default 20)'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter transactions from this date (ISO 8601 format, e.g. 2024-01-01)'),
      toDate: z
        .string()
        .optional()
        .describe('Filter transactions until this date (ISO 8601 format)'),
      merchantId: z.string().optional().describe('Filter by merchant ID'),
      state: z.string().optional().describe('Filter by transaction state'),
      syncStatus: z.string().optional().describe('Filter by sync status (e.g. SYNC_READY)'),
      entityId: z.string().optional().describe('Filter by business entity ID'),
      spendLimitId: z.string().optional().describe('Filter by spend limit ID'),
      userId: z.string().optional().describe('Filter by user ID')
    })
  )
  .output(
    z.object({
      transactions: z.array(z.any()).describe('List of transaction objects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listTransactions({
      start: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      merchantId: ctx.input.merchantId,
      state: ctx.input.state,
      syncStatus: ctx.input.syncStatus,
      entityId: ctx.input.entityId,
      spendLimitId: ctx.input.spendLimitId,
      userId: ctx.input.userId
    });

    return {
      output: {
        transactions: result.data,
        nextCursor: result.page?.next
      },
      message: `Retrieved **${result.data.length}** transactions${result.page?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
