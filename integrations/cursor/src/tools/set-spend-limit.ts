import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let setSpendLimit = SlateTool.create(spec, {
  name: 'Set User Spend Limit',
  key: 'set_user_spend_limit',
  description: `Set or remove a monthly spend limit for a team member. Set to null to remove the limit. Requires an Admin API key with Enterprise access.`,
  constraints: ['Enterprise only.', 'Spend limit must be an integer (whole dollars).'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userEmail: z.string().describe('Email of the team member'),
      spendLimitDollars: z
        .number()
        .int()
        .nullable()
        .describe('Monthly spend limit in dollars (integer). Set to null to remove the limit.')
    })
  )
  .output(
    z.object({
      outcome: z.string().describe('Result: success or error'),
      message: z.string().describe('Details about the outcome')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.setUserSpendLimit({
      userEmail: ctx.input.userEmail,
      spendLimitDollars: ctx.input.spendLimitDollars
    });

    return {
      output: {
        outcome: result.outcome,
        message: result.message
      },
      message:
        ctx.input.spendLimitDollars !== null
          ? `Spend limit for **${ctx.input.userEmail}** set to **$${ctx.input.spendLimitDollars}**/month.`
          : `Spend limit removed for **${ctx.input.userEmail}**.`
    };
  })
  .build();
