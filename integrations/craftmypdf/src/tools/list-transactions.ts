import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `List PDF generation transactions for tracking and auditing. Returns transaction history including credits consumed, operations performed, and file URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transactions to return per page. Default is 300.'),
      offset: z.number().optional().describe('Number of transactions to skip for pagination.')
    })
  )
  .output(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionRef: z.string().describe('Unique transaction reference.'),
            templateId: z.string().describe('ID of the template used.'),
            credits: z.number().describe('Credits consumed by this transaction.'),
            createdAt: z.string().describe('Timestamp when the transaction occurred.'),
            operation: z.string().describe('Type of operation performed.'),
            fileUrl: z.string().describe('URL to the generated file.')
          })
        )
        .describe('List of transactions.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTransactions({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let transactions = (result.transactions || []).map(t => ({
      transactionRef: t.transaction_ref,
      templateId: t.template_id || '',
      credits: t.credits,
      createdAt: t.created_at,
      operation: t.operation || '',
      fileUrl: t.file || ''
    }));

    return {
      output: { transactions },
      message: `Found **${transactions.length}** transaction(s).`
    };
  })
  .build();
