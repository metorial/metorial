import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Scrapfly account information including current project details, usage statistics, remaining credits, concurrency limits, and subscription information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z
        .any()
        .optional()
        .describe('Account-level information (ID, timezone, currency).'),
      project: z
        .any()
        .optional()
        .describe('Current project details (name, quotas, usage, budget).'),
      subscription: z
        .any()
        .optional()
        .describe('Subscription details (plan name, billing period, pricing).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getAccount();

    return {
      output: {
        account: result?.account,
        project: result?.project,
        subscription: result?.subscription
      },
      message: `Retrieved account info. Project: **${result?.project?.name ?? 'unknown'}**. Subscription: ${result?.subscription?.name ?? 'unknown'}.`
    };
  })
  .build();
