import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { nonempty, nullableText, numeric, uid } from '../lib/contracts';
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
    const client = new BannerbearClient(ctx.auth);
    const result = await client.getAccount();
    const output = {
      accountUid: uid(result.uid),
      planName: nullableText(result.paid_plan_name),
      apiUsage: numeric(result.api_usage),
      apiQuota: numeric(result.api_quota),
      createdAt: nonempty(result.created_at)
    };
    return {
      output,
      message: `Retrieved the authenticated account's actual usage and quota (${output.apiUsage}/${output.apiQuota}).`
    };
  })
  .build();
