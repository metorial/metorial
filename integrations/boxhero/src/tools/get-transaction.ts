import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransaction, transactionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description:
    'Retrieve one inventory transaction with full line items and its revision for safe updates or deletion. Call list_transactions to discover transaction IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      transactionId: z
        .number()
        .describe('Transaction ID from list_transactions or create_transaction'),
      revision: z
        .number()
        .int()
        .nonnegative()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Historical revision; omit for latest')
    })
  )
  .output(z.object({ transaction: transactionSchema }))
  .handleInvocation(async ctx => {
    let transaction = await new Client({ token: ctx.auth.token }).getTransaction(
      ctx.input.transactionId,
      ctx.input.revision
    );
    return {
      output: { transaction: mapTransaction(transaction) },
      message: `Retrieved transaction ${transaction.id}.`
    };
  })
  .build();
