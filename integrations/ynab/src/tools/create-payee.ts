import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput } from '../lib/validation';
import { spec } from '../spec';
export const createPayee = SlateTool.create(spec, {
  name: 'Create Payee',
  key: 'create_payee',
  description:
    'Create a payee in a budget. Payees are retained because the API does not provide payee deletion.',
  tags: { destructive: false }
})
  .input(
    z.object({
      budgetId: budgetInput,
      name: z.string().trim().min(1).max(500).describe('Payee name, at most 500 characters.')
    })
  )
  .output(z.object({ payeeId: z.string(), name: z.string() }))
  .handleInvocation(async ctx => {
    const payee = await new Client({ token: ctx.auth.token }).createPayee(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.name
    );
    return {
      output: { payeeId: payee.id, name: payee.name },
      message: `Created payee ${payee.id}; this resource is retained.`
    };
  })
  .build();
