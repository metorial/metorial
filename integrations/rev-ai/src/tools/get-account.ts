import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves account information including the email address and credit balances in USD for the authenticated Rev AI account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      balanceSeconds: z
        .number()
        .describe('Deprecated provider field, always zero; use totalBalance instead'),
      freeBalance: z.number().optional().describe('Free credit balance in USD'),
      purchasedBalance: z.number().optional().describe('Purchased credit balance in USD'),
      totalBalance: z
        .number()
        .optional()
        .describe('Total free and purchased credit balance in USD'),
      invoicedBalance: z
        .number()
        .optional()
        .describe('Invoice balance in USD, when available'),
      hipaaEnabled: z.boolean().optional().describe('Whether HIPAA is enabled for the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let account = await client.getAccount();

    return {
      output: account,
      message: `Account: **${account.email}**${account.totalBalance !== undefined ? ` — Credit balance: **$${account.totalBalance.toFixed(2)} USD**` : ''}.`
    };
  })
  .build();
