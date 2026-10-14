import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentAccount = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'get_current_account',
  description:
    'Retrieve the organization associated with your API key, its subscription plan, and credit usage for the current billing period.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string().describe('Organization associated with the API key'),
      plan: z.string().describe('Subscription plan name'),
      maxCredits: z.number().describe('Maximum credits in the current billing period'),
      usedCredits: z.number().describe('Credits used in the current billing period'),
      remainingCredits: z.number().describe('Credits remaining in the current billing period')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCurrentAccount();
    let remainingCredits = Math.max(0, result.maxCredits - result.usedCredits);

    return {
      output: { ...result, remainingCredits },
      message: `Supadata organization **${result.organizationId}** uses the **${result.plan}** plan with **${remainingCredits}** credits remaining.`
    };
  })
  .build();
