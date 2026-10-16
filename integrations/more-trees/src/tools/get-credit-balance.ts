import { SlateTool } from 'slates';
import { z } from 'zod';
import { accountCodeField } from '../lib/account';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Retrieve the current credit balance on your More Trees account. Provide accountCode from Settings > Account Settings to retrieve the balance from account information. When omitted, uses the connected key's balance endpoint. Credits are consumed when trees are planted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountCode: accountCodeField.describe(
        'Optional More Trees account code from Settings > Account Settings. When supplied, retrieves the balance from account information.'
      )
    })
  )
  .output(
    z.object({
      creditBalance: z.number().describe('Current credit balance on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let result =
      ctx.input.accountCode !== undefined
        ? { creditBalance: (await client.getAccountInfo(ctx.input.accountCode)).creditBalance }
        : await client.viewCredits();

    return {
      output: result,
      message: `Credit balance: **${result.creditBalance}** credits.`
    };
  })
  .build();
