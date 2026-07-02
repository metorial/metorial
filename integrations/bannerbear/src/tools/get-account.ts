import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the current Bannerbear account status, including plan details, API usage, and quota levels. Usage resets at the start of every month.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountUid: z.string().describe('Account UID'),
      planName: z.string().nullable().describe('Current paid plan name'),
      apiUsage: z.number().describe('Number of API calls used this month'),
      apiQuota: z.number().describe('Total API call quota for the month'),
      createdAt: z.string().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.getAccount();

    return {
      output: {
        accountUid: result.uid,
        planName: result.paid_plan_name || null,
        apiUsage: result.api_usage,
        apiQuota: result.api_quota,
        createdAt: result.created_at
      },
      message: `Account **${result.paid_plan_name || 'Free'}** — API usage: ${result.api_usage}/${result.api_quota} this month.`
    };
  })
  .build();
