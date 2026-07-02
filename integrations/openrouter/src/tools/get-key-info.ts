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
      usageDaily: z.number().optional().describe('Daily usage for this key'),
      usageWeekly: z.number().optional().describe('Weekly usage for this key'),
      usageMonthly: z.number().optional().describe('Monthly usage for this key'),
      byokUsage: z.number().optional().describe('Total BYOK usage for this key'),
      limit: z.number().nullable().optional().describe('Spending limit (null = unlimited)'),
      limitRemaining: z.number().optional().describe('Remaining spend under the key limit'),
      limitReset: z
        .string()
        .nullable()
        .optional()
        .describe('Limit reset interval, or null for no reset'),
      includeByokInLimit: z
        .boolean()
        .optional()
        .describe('Whether BYOK usage counts toward the key limit'),
      isFreeTier: z.boolean().optional().describe('Whether the key is on the free tier'),
      isManagementKey: z
        .boolean()
        .optional()
        .describe('Whether this key can manage keys, credits, and guardrails'),
      isProvisioningKey: z.boolean().optional().describe('Whether this is a provisioning key'),
      expiresAt: z.string().nullable().optional().describe('Expiration timestamp'),
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
      usage: typeof data.usage === 'number' ? data.usage : undefined,
      usageDaily: typeof data.usage_daily === 'number' ? data.usage_daily : undefined,
      usageWeekly: typeof data.usage_weekly === 'number' ? data.usage_weekly : undefined,
      usageMonthly: typeof data.usage_monthly === 'number' ? data.usage_monthly : undefined,
      byokUsage: typeof data.byok_usage === 'number' ? data.byok_usage : undefined,
      limit: data.limit !== undefined ? (data.limit as number | null) : undefined,
      limitRemaining:
        typeof data.limit_remaining === 'number' ? data.limit_remaining : undefined,
      limitReset:
        data.limit_reset !== undefined ? (data.limit_reset as string | null) : undefined,
      includeByokInLimit:
        data.include_byok_in_limit !== undefined
          ? (data.include_byok_in_limit as boolean)
          : undefined,
      isFreeTier: data.is_free_tier !== undefined ? (data.is_free_tier as boolean) : undefined,
      isManagementKey:
        data.is_management_key !== undefined ? (data.is_management_key as boolean) : undefined,
      isProvisioningKey:
        data.is_provisioning_key !== undefined
          ? (data.is_provisioning_key as boolean)
          : undefined,
      expiresAt:
        data.expires_at !== undefined ? (data.expires_at as string | null) : undefined,
      rateLimitRequests: rateLimit ? (rateLimit.requests as number) || undefined : undefined,
      rateLimitInterval: rateLimit ? (rateLimit.interval as string) || undefined : undefined
    };

    return {
      output,
      message: `Key **${output.label || 'unnamed'}**: usage $${output.usage?.toFixed(4) || '0'}, limit: ${output.limit !== null && output.limit !== undefined ? `$${output.limit}` : 'unlimited'}.`
    };
  })
  .build();
