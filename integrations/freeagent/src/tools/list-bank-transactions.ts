import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listBankTransactions = SlateTool.create(spec, {
  name: 'List Bank Transactions',
  key: 'list_bank_transactions',
  description: `Retrieve bank transactions for a specific bank account in FreeAgent. Can filter by date range and explanation status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bankAccountId: z.string().describe('The bank account ID to list transactions for'),
      view: z
        .enum(['all', 'unexplained', 'explained', 'manual', 'imported', 'marked_for_review'])
        .optional()
        .describe('Filter by transaction status'),
      fromDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      bankTransactions: z
        .array(z.record(z.string(), z.any()))
        .describe('List of bank transaction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let bankTransactions = await client.listBankTransactions(ctx.input.bankAccountId, {
      view: ctx.input.view,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      updatedSince: ctx.input.updatedSince,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let count = bankTransactions.length;

    return {
      output: { bankTransactions },
      message: `Found **${count}** transaction${count !== 1 ? 's' : ''} for bank account **${ctx.input.bankAccountId}**.`
    };
  })
  .build();
