import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Check the remaining credit balance and daily verification limits for the authenticated Clearout account.
Returns available credits, daily verify limit, reset date, and low balance threshold.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      availableCredits: z.number().optional().describe('Remaining credits on the account'),
      availableDailyVerifyLimit: z
        .number()
        .optional()
        .describe('Remaining daily verification limit'),
      resetDailyVerifyLimitDate: z
        .string()
        .optional()
        .describe('Date/time when the daily verify limit resets'),
      lowCreditBalanceMinThreshold: z
        .number()
        .optional()
        .describe('Minimum threshold for low credit balance warning')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getCredits();
    let data = (result.data ?? result) as Record<string, unknown>;

    let output = {
      availableCredits: data.available_credits as number | undefined,
      availableDailyVerifyLimit: data.available_daily_verify_limit as number | undefined,
      resetDailyVerifyLimitDate: data.reset_daily_verify_limit_date as string | undefined,
      lowCreditBalanceMinThreshold: data.low_credit_balance_min_threshold as number | undefined
    };

    return {
      output,
      message: `Account has **${output.availableCredits ?? 'unknown'}** credits remaining. Daily verify limit: **${output.availableDailyVerifyLimit ?? 'unknown'}**.`
    };
  })
  .build();
