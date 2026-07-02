import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountPlan = SlateTool.create(spec, {
  name: 'Get Account Plan',
  key: 'get_account_plan',
  description: `Retrieve account and subscription plan information from your Mailercloud account. Returns details about the current plan, usage, and account settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        plan: z.record(z.string(), z.unknown()).optional().describe('Account plan details')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccountPlan();

    let data = result?.data ?? result;

    return {
      output: {
        plan: data,
        ...data
      },
      message: `Successfully retrieved account plan information.`
    };
  })
  .build();
