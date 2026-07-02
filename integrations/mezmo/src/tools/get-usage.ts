import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve aggregated usage information for your Mezmo account. Can break down usage by applications, hosts, or tags. Usage is reported at day-level granularity and measured in bytes consumed on disk.`,
  instructions: [
    'Time range is specified as Unix timestamps in seconds. Only the day portion is used to establish a date range.',
    'Choose a breakdown type to see usage by specific dimension, or use "account" for overall usage.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      from: z.number().describe('Start time as Unix timestamp in seconds'),
      to: z.number().describe('End time as Unix timestamp in seconds'),
      breakdown: z
        .enum(['account', 'apps', 'hosts', 'tags'])
        .optional()
        .default('account')
        .describe('Dimension to break down usage by'),
      appName: z
        .string()
        .optional()
        .describe('Specific application name (only used when breakdown is "apps")')
    })
  )
  .output(
    z.object({
      usage: z.unknown().describe('Usage data (structure varies by breakdown type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let timeRange = { from: ctx.input.from, to: ctx.input.to };
    let usage: unknown;

    switch (ctx.input.breakdown) {
      case 'apps':
        if (ctx.input.appName) {
          usage = await client.getUsageByApp(ctx.input.appName, timeRange);
        } else {
          usage = await client.getUsageByApps(timeRange);
        }
        break;
      case 'hosts':
        usage = await client.getUsageByHosts(timeRange);
        break;
      case 'tags':
        usage = await client.getUsageByTags(timeRange);
        break;
      default:
        usage = await client.getUsage(timeRange);
        break;
    }

    return {
      output: { usage },
      message: `Retrieved **${ctx.input.breakdown}** usage data for the specified time range.`
    };
  })
  .build();
