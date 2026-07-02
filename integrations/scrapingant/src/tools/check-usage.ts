import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkUsage = SlateTool.create(spec, {
  name: 'Check Usage',
  key: 'check_usage',
  description: `Check the current API credit usage and subscription status for your ScrapingAnt account. Returns plan details, remaining credits, and subscription period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      planName: z.string().describe('Name of the active subscription plan'),
      startDate: z.string().describe('Start date of the current subscription period'),
      endDate: z.string().describe('End date of the current subscription period'),
      planTotalCredits: z.number().describe('Total API credits included in the plan'),
      remainedCredits: z.number().describe('Number of API credits remaining')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let usage = await client.getUsage();

    return {
      output: usage,
      message: `**${usage.planName}** plan: **${usage.remainedCredits}** of ${usage.planTotalCredits} credits remaining (period: ${usage.startDate} to ${usage.endDate}).`
    };
  })
  .build();
