import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account details including current API usage, quota, plan information, and contact details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().optional(),
      name: z.string().optional(),
      apiUsage: z.number().optional(),
      apiQuota: z.number().optional(),
      usagePercentage: z.number().optional(),
      plan: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let account = await client.getAccount();

    return {
      output: {
        email: account.email,
        name: account.name,
        apiUsage: account.apiUsage,
        apiQuota: account.apiQuota,
        usagePercentage: account.usagePercentage,
        plan: account.plan
      },
      message: `Account **${account.name}** (${account.email}) on **${account.plan}** plan. API usage: ${account.apiUsage}/${account.apiQuota} (${account.usagePercentage}%).`
    };
  })
  .build();
