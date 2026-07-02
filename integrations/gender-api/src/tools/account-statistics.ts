import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountStatistics = SlateTool.create(spec, {
  name: 'Account Statistics',
  key: 'account_statistics',
  description: `Retrieve account usage statistics including remaining request credits, whether the credit limit has been reached, and last month's usage. Useful for monitoring API consumption and avoiding service interruptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      isLimitReached: z
        .boolean()
        .describe('Whether the account credit limit has been reached'),
      remainingCredits: z.number().describe('Number of credits still available'),
      creditsUsed: z.number().describe('Credits consumed in the current billing period'),
      lastMonthDate: z
        .string()
        .describe('Year-month of the last billing period (e.g. "2024-03")'),
      lastMonthCreditsUsed: z
        .number()
        .describe('Credits consumed in the previous billing period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getStatistics();

    return {
      output: {
        isLimitReached: result.isLimitReached,
        remainingCredits: result.remainingCredits,
        creditsUsed: result.details.creditsUsed,
        lastMonthDate: result.usageLastMonth.date,
        lastMonthCreditsUsed: result.usageLastMonth.creditsUsed
      },
      message: `**${result.remainingCredits}** credits remaining. Limit reached: **${result.isLimitReached ? 'Yes' : 'No'}**. Last month usage: **${result.usageLastMonth.creditsUsed}** credits.`
    };
  })
  .build();
