import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKeyInfo = SlateTool.create(spec, {
  name: 'Get Key Info',
  key: 'get_key_info',
  description: `Retrieve information about the currently authenticated API key, including its label, usage, spending limit, and rate limit configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      label: z.string().optional().describe('Key label/name'),
      usage: z.number().optional().describe('Total credits used by this key'),
      limit: z.number().nullable().optional().describe('Spending limit (null = unlimited)'),
      isFreeTier: z.boolean().optional().describe('Whether the key is on the free tier'),
      rateLimitRequests: z
        .number()
        .optional()
        .describe('Rate limit: max requests per interval'),
      rateLimitInterval: z
        .string()
        .optional()
        .describe('Rate limit interval (e.g., "10s", "1m")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.getKeyInfo();

    let rateLimit = data.rate_limit as Record<string, unknown> | undefined;

    let output = {
      label: (data.label as string) || undefined,
      usage: (data.usage as number) || undefined,
      limit: data.limit !== undefined ? (data.limit as number | null) : undefined,
      isFreeTier: (data.is_free_tier as boolean) || undefined,
      rateLimitRequests: rateLimit ? (rateLimit.requests as number) || undefined : undefined,
      rateLimitInterval: rateLimit ? (rateLimit.interval as string) || undefined : undefined
    };

    return {
      output,
      message: `Key **${output.label || 'unnamed'}**: usage $${output.usage?.toFixed(4) || '0'}, limit: ${output.limit !== null && output.limit !== undefined ? `$${output.limit}` : 'unlimited'}.`
    };
  })
  .build();
