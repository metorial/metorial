import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let creditUsageSchema = z.object({
  creditType: z.string().optional().describe('Type of credit'),
  allocated: z
    .any()
    .optional()
    .describe('Total allocated credits (may be "inf" for unlimited)'),
  used: z.number().optional().describe('Credits used'),
  remaining: z.any().optional().describe('Credits remaining (may be "inf" for unlimited)')
});

let rateLimitSchema = z.object({
  action: z.string().optional().describe('The credit action being rate limited'),
  duration: z.string().optional().describe('Duration of the rate limit window'),
  limit: z.number().nullable().optional().describe('Maximum requests in the window'),
  used: z.number().optional().describe('Requests used in the current window'),
  remaining: z
    .number()
    .nullable()
    .optional()
    .describe('Requests remaining in the current window')
});

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your RocketReach account details including credit usage and rate limits. Shows how many lookup and export credits you have remaining.

Useful for monitoring API usage and ensuring you have sufficient credits before performing bulk operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().optional().describe('RocketReach user ID'),
      firstName: z.string().nullable().optional().describe('Account first name'),
      lastName: z.string().nullable().optional().describe('Account last name'),
      email: z.string().nullable().optional().describe('Account email address'),
      accountState: z
        .string()
        .optional()
        .describe('Account state (anonymous, test_user, registered)'),
      creditUsage: z
        .array(creditUsageSchema)
        .optional()
        .describe('Credit allocation and usage details'),
      rateLimits: z.array(rateLimitSchema).optional().describe('Current rate limit status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccount();

    let creditUsage = (result.credit_usage || []).map((c: any) => ({
      creditType: c.credit_type,
      allocated: c.allocated,
      used: c.used,
      remaining: c.remaining
    }));

    let rateLimits = (result.rate_limits || []).map((r: any) => ({
      action: r.action,
      duration: r.duration,
      limit: r.limit,
      used: r.used,
      remaining: r.remaining
    }));

    let output = {
      userId: result.id,
      firstName: result.first_name,
      lastName: result.last_name,
      email: result.email,
      accountState: result.state,
      creditUsage,
      rateLimits
    };

    let creditSummary = creditUsage
      .map((c: any) => `${c.creditType}: ${c.remaining}/${c.allocated} remaining`)
      .join(', ');

    return {
      output,
      message: `Account: **${[result.first_name, result.last_name].filter(Boolean).join(' ') || result.email || 'Unknown'}**. Credits: ${creditSummary || 'N/A'}.`
    };
  })
  .build();
