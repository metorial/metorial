import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetInput, idInput, required } from '../lib/validation';
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
      budgetId: budgetInput,
      payeeId: idInput.describe('Payee ID to update'),
      name: z.string().trim().min(1).max(500).describe('New payee name')
    })
  )
  .output(
    z.object({
      payeeId: z.string().describe('Payee ID'),
      name: z.string().describe('Updated payee name')
    })
  )
  .handleInvocation(async ctx => {
    const payee = await new Client({ token: ctx.auth.token }).updatePayee(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.payeeId,
      { name: required(ctx.input.name, 'Payee name') }
    );
    if (payee.id !== ctx.input.payeeId || payee.deleted || payee.name !== ctx.input.name)
      throw createApiServiceError('YNAB did not confirm the requested payee name.', {
        reason: 'ynab_response'
      });
    return {
      output: { payeeId: payee.id, name: payee.name },
      message: `Updated payee ${payee.id}.`
    };
  })
  .build();
