import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve aggregated usage information for your Mezmo account. Can break down usage by applications, hosts, or tags. Usage is reported per day. Account totals are bytes consumed on disk. Dimension reports retain their legacy percentage-of-ingested-lines metric unless metric="bytes" is requested.`,
  instructions: [
    'Time range is specified as Unix timestamps in seconds. Only the day portion is used to establish a date range.',
    'Choose a breakdown type to see usage by specific dimension, or use "account" for overall usage.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      from: z
        .number()
        .multipleOf(1)
        .nonnegative()
        .describe('Start time as Unix timestamp in seconds'),
      to: z
        .number()
        .multipleOf(1)
        .nonnegative()
        .describe('End time as Unix timestamp in seconds'),
      breakdown: z
        .enum(['account', 'apps', 'hosts', 'tags'])
        .optional()
        .default('account')
        .describe('Dimension to break down usage by'),
      metric: z
        .enum(['percentage', 'bytes'])
        .optional()
        .describe(
          'Dimension metric; defaults to percentage for dimensions and bytes for account totals'
        ),
      limit: z
        .number()
        .multipleOf(1)
        .positive()
        .optional()
        .describe('Maximum number of dimension rows to retrieve; not a pagination cursor'),
      appName: z
        .string()
        .optional()
        .describe('Specific application name (only used when breakdown is "apps")')
    })
  )
  .output(
    z.object({
      metric: z
        .enum(['percentage', 'bytes'])
        .describe('Units represented by the usage report'),
      usage: z.unknown().describe('Usage data (structure varies by breakdown type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    const metric =
      ctx.input.metric ?? (ctx.input.breakdown === 'account' ? 'bytes' : 'percentage');
    if (ctx.input.appName && ctx.input.breakdown !== 'apps')
      throw createApiServiceError('appName is only supported with the apps breakdown.');
    if (ctx.input.breakdown === 'account' && metric !== 'bytes')
      throw createApiServiceError(
        'Account usage is available in bytes. Use a dimension breakdown for percentage reports.'
      );
    const timeRange = { from: ctx.input.from, to: ctx.input.to, limit: ctx.input.limit };
    const usage =
      ctx.input.breakdown === 'account'
        ? await client.getUsage(timeRange)
        : await client.getDimensionUsage(
            ctx.input.breakdown,
            timeRange,
            metric,
            ctx.input.appName
          );

    return {
      output: { usage, metric },
      message: `Retrieved **${ctx.input.breakdown}** usage data for the specified time range.`
    };
  })
  .build();
