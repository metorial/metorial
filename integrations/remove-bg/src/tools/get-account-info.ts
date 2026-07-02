import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current Remove.bg account information including credit balance breakdown and free API call allowance. Useful for checking remaining credits before processing images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsTotal: z.number().describe('Total available credits across all sources.'),
      creditsSubscription: z.number().describe('Credits from the active subscription plan.'),
      creditsPayg: z.number().describe('Pay-as-you-go credits purchased separately.'),
      creditsEnterprise: z.number().describe('Enterprise credits allocated to the account.'),
      freeApiCalls: z.number().describe('Number of free API calls remaining this month.'),
      apiSizes: z.string().describe('Available output sizes for the account plan.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: account,
      message: `Account has **${account.creditsTotal}** total credits (subscription: ${account.creditsSubscription}, pay-as-you-go: ${account.creditsPayg}, enterprise: ${account.creditsEnterprise}). Free API calls: **${account.freeApiCalls}**.`
    };
  })
  .build();
