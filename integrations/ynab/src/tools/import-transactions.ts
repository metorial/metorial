import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      budgetId: z.string().optional().describe('Budget ID. Defaults to the configured budget.')
    })
  )
  .output(
    z.object({
      transactionIds: z.array(z.string()).describe('IDs of newly imported transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let result = await client.importTransactions(budgetId);
    let transactionIds = result?.transaction_ids ?? [];

    return {
      output: { transactionIds },
      message: `Imported **${transactionIds.length}** transaction(s) from linked accounts`
    };
  })
  .build();
