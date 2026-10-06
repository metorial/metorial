import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput } from '../lib/validation';
import { spec } from '../spec';

export let importTransactions = SlateTool.create(spec, {
  name: 'Import Bank Transactions',
  key: 'import_transactions',
  description: `Trigger an import of transactions from all linked bank accounts in a budget. This is equivalent to clicking "Import" in the YNAB app. Only works for accounts that have direct import enabled.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: budgetInput
    })
  )
  .output(
    z.object({
      transactionIds: z.array(z.string()).describe('IDs of newly imported transactions')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).importTransactions(
      ctx.input.budgetId ?? ctx.config.budgetId
    );
    return {
      output: { transactionIds: result.transaction_ids },
      message: `YNAB reported ${result.transaction_ids.length} imported transaction(s). Matching and bank-import history can be retained.`
    };
  })
  .build();
