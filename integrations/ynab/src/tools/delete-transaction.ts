import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput, idInput } from '../lib/validation';
import { spec } from '../spec';

export let deleteTransaction = SlateTool.create(spec, {
  name: 'Delete Transaction',
  key: 'delete_transaction',
  description: `Delete a transaction by its ID. The transaction will be marked as deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      budgetId: budgetInput,
      transactionId: idInput.describe('ID of the transaction to delete')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('ID of the deleted transaction'),
      deleted: z.boolean().describe('Whether the transaction was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    const t = await new Client({ token: ctx.auth.token }).deleteTransaction(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.transactionId
    );
    return {
      output: { transactionId: t.id, deleted: t.deleted },
      message: `Confirmed deletion of transaction ${t.id}.`
    };
  })
  .build();
