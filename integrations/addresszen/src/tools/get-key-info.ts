import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

export let getKeyInfo = SlateTool.create(spec, {
  name: 'Get API Key Info',
  key: 'get_key_info',
  description: `Retrieve details about an API key including remaining lookups, available datasets, usage limits, and daily limits. Can also check basic key availability (public info) or get detailed private information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      apiKey: z.string().describe('The API key to retrieve information for'),
      includeDetails: z
        .boolean()
        .default(true)
        .describe(
          'Whether to include detailed private key information (remaining lookups, limits). Set to false for public availability check only.'
        )
    })
  )
  .output(
    z.object({
      available: z.boolean().optional().describe('Whether the API key is available/valid'),
      remainingLookups: z
        .number()
        .optional()
        .describe('Number of remaining lookups on this key'),
      dailyLimit: z
        .object({
          limit: z.number().optional().describe('Daily lookup limit'),
          consumed: z.number().optional().describe('Lookups consumed today')
        })
        .optional()
        .describe('Daily usage limit information'),
      individualLimit: z
        .object({
          limit: z.number().optional().describe('Per-IP lookup limit'),
          consumed: z.number().optional().describe('Lookups consumed from this IP')
        })
        .optional()
        .describe('Per-IP usage limit information'),
      datasets: z.array(z.string()).optional().describe('Available datasets for this key'),
      allowedUrls: z
        .array(z.string())
        .optional()
        .describe('URL whitelist configured for this key'),
      notifications: z
        .record(z.string(), z.any())
        .optional()
        .describe('Notification settings'),
      enabled: z.boolean().optional().describe('Whether the key is enabled'),
      code: z.number().optional().describe('API response code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressZenClient({ token: ctx.auth.token });

    if (!ctx.input.includeDetails) {
      let result = await client.getKeyAvailability(ctx.input.apiKey);
      let r = result.result || {};

      return {
        output: {
          available: r.available,
          code: result.code
        },
        message: `API key is ${r.available ? '**available**' : '**unavailable**'}.`
      };
    }

    let result = await client.getKeyDetails(ctx.input.apiKey);
    let r = result.result || {};

    let output = {
      available: true,
      remainingLookups: r.lookups_remaining,
      dailyLimit: r.daily_limit
        ? {
            limit: r.daily_limit.limit,
            consumed: r.daily_limit.consumed
          }
        : undefined,
      individualLimit: r.individual_limit
        ? {
            limit: r.individual_limit.limit,
            consumed: r.individual_limit.consumed
          }
        : undefined,
      datasets: r.datasets,
      allowedUrls: r.allowed_urls,
      notifications: r.notifications,
      enabled: r.enabled,
      code: result.code
    };

    return {
      output,
      message: `API key has **${output.remainingLookups ?? 'unknown'}** remaining lookups.${output.dailyLimit?.limit ? ` Daily limit: ${output.dailyLimit.consumed}/${output.dailyLimit.limit}.` : ''}`
    };
  })
  .build();
