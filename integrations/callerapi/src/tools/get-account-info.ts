import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve account information for the authenticated CallerAPI user, including email, credits spent, monthly credit allowance, and remaining credits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().optional().describe('Account email address'),
      creditsSpent: z.number().optional().describe('Number of credits spent'),
      creditsMonthly: z.number().optional().describe('Monthly credit allowance'),
      creditsLeft: z.number().optional().describe('Remaining credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getAccountInfo();

    return {
      output: {
        email: result.email,
        creditsSpent: result.credits_spent,
        creditsMonthly: result.credits_monthly,
        creditsLeft: result.credits_left
      },
      message: `Account: **${result.email ?? 'N/A'}**. Credits remaining: **${result.credits_left ?? 'N/A'}** / **${result.credits_monthly ?? 'N/A'}** monthly.`
    };
  })
  .build();
