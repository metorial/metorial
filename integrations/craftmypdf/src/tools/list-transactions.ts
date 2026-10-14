import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `List PDF generation transactions for tracking and auditing, including credits consumed, transaction type, execution time, and response status.`,
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
            templateId: z
              .string()
              .optional()
              .describe('ID of the template used, when available.'),
            credits: z.number().describe('Credits consumed by this transaction.'),
            createdAt: z.string().describe('Timestamp when the transaction occurred.'),
            operation: z.string().describe('Type of operation performed.'),
            fileUrl: z.string().optional().describe('Generated file URL when provided.'),
            status: z
              .string()
              .optional()
              .describe('Response status, including async webhook delivery status.'),
            executionTimeMs: z.number().optional().describe('Execution time in milliseconds.'),
            fileSizeBytes: z.number().optional().describe('Generated file size in bytes.')
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

    let transactions = (result.transactions || []).map(t => {
      let credits = Number(t.credit);
      if (t.credit === '' || !Number.isFinite(credits)) {
        throw createApiServiceError(
          'CraftMyPDF returned an invalid transaction credit amount.'
        );
      }
      return {
        transactionRef: t.transaction_ref,
        templateId: t.template_id,
        credits,
        createdAt: t.created_at,
        operation: t.transaction_type,
        fileUrl: t.file,
        status: t.resp_status,
        executionTimeMs: t.exec_tm,
        fileSizeBytes: t.resp_file_size
      };
    });

    return {
      output: { transactions },
      message: `Found **${transactions.length}** transaction(s).`
    };
  })
  .build();
