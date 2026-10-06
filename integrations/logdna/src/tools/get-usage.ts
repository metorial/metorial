import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve aggregated log usage information for the LogDNA account. Can be broken down by apps, hosts, or tags. Usage is reported as bytes used, with daily granularity.`,
  instructions: [
    'Provide "from" and "to" as Unix timestamps in seconds. The provider v2 report converts these seconds to ISO dates and uses day-level granularity.',
    'Use "breakdown" to get usage for a specific dimension (apps, hosts, or tags).',
    'Use "appName" to get usage for a single specific application.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      from: z.number().describe('Start time as Unix timestamp in seconds'),
      to: z.number().describe('End time as Unix timestamp in seconds'),
      breakdown: z
        .enum(['apps', 'hosts', 'tags'])
        .optional()
        .describe('Dimension to break down usage by'),
      appName: z
        .string()
        .optional()
        .describe('Specific app name to get usage for (only when breakdown is "apps")')
    })
  )
  .output(
    z.object({
      usage: z.any().describe('Usage data returned from LogDNA')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let result: unknown;
    if (
      ctx.input.appName !== undefined &&
      ctx.input.breakdown &&
      ctx.input.breakdown !== 'apps'
    )
      throw createApiServiceError('appName can only be combined with the apps breakdown.');

    if (ctx.input.appName !== undefined) {
      result = await client.getUsageForApp(ctx.input.appName, ctx.input.from, ctx.input.to);
    } else if (ctx.input.breakdown === 'apps') {
      result = await client.getUsageByApps(ctx.input.from, ctx.input.to);
    } else if (ctx.input.breakdown === 'hosts') {
      result = await client.getUsageByHosts(ctx.input.from, ctx.input.to);
    } else if (ctx.input.breakdown === 'tags') {
      result = await client.getUsageByTags(ctx.input.from, ctx.input.to);
    } else {
      result = await client.getUsage(ctx.input.from, ctx.input.to);
    }

    let breakdown = ctx.input.appName
      ? `app **${ctx.input.appName}**`
      : ctx.input.breakdown
        ? `**${ctx.input.breakdown}**`
        : 'the account';

    return {
      output: { usage: result },
      message: `Retrieved usage data for ${breakdown}.`
    };
  })
  .build();
