import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePayee = SlateTool.create(spec, {
  name: 'Update Payee',
  key: 'update_payee',
  description: `Rename an existing payee.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      payeeId: z.string().describe('Payee ID to update'),
      name: z.string().describe('New payee name')
    })
  )
  .output(
    z.object({
      payeeId: z.string().describe('Payee ID'),
      name: z.string().describe('Updated payee name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let payee = await client.updatePayee(budgetId, ctx.input.payeeId, {
      name: ctx.input.name
    });

    return {
      output: {
        payeeId: payee.id,
        name: payee.name
      },
      message: `Renamed payee to **${payee.name}**`
    };
  })
  .build();
