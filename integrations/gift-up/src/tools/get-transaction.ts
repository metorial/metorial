import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapTransaction, transactionOutputSchema } from './list-transactions';

export let getTransaction = SlateTool.create(spec, {
  key: 'get_transaction',
  name: 'Get Transaction',
  description:
    'Retrieve a financial transaction by ID, including its order, gift card, financial changes, actor, and metadata. IDs are returned by list_transactions and balance operations.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .describe('Transaction ID from list_transactions or a balance operation')
    })
  )
  .output(transactionOutputSchema)
  .handleInvocation(async ctx => {
    let transaction = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).getTransaction(ctx.input.transactionId);
    return {
      output: mapTransaction(transaction),
      message: `Retrieved ${transaction.eventType} transaction ${transaction.id}.`
    };
  })
  .build();
