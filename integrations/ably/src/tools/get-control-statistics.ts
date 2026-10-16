import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { accountIdInput, appIdInput } from '../lib/schemas';
import { validateQuery } from '../lib/validation';
import { spec } from '../spec';

export let getControlStatistics = SlateTool.create(spec, {
  name: 'Get Control API Statistics',
  key: 'get_control_statistics',
  description:
    'Retrieve usage statistics for an account or app with a Control API token, including the full provider statistics entries.',
  instructions: [
    'Requires Control API Token authentication with the applicable statistics capability.',
    'Call who_am_i to discover the account ID, or manage_apps with action list to discover app IDs.',
    'For account scope supply accountId; for app scope supply appId. Saved config IDs are fallbacks.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      scope: z.enum(['app', 'account']).describe('Statistics scope'),
      accountId: accountIdInput,
      appId: appIdInput,
      start: z.number().optional().describe('Start time in milliseconds since the Unix epoch'),
      end: z.number().optional().describe('End time in milliseconds since the Unix epoch'),
      limit: z.number().optional().describe('Maximum records, default 100 and maximum 1000'),
      direction: z
        .enum(['forwards', 'backwards'])
        .optional()
        .describe('Query order; defaults to backwards'),
      unit: z
        .enum(['minute', 'hour', 'day', 'month'])
        .optional()
        .describe('Aggregation unit; defaults to minute')
    })
  )
  .output(
    z.object({
      statistics: z.array(z.any()).describe('Complete statistics records returned by Ably')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyControlClient(ctx.auth.token, ctx.auth.authType);
    let id =
      ctx.input.scope === 'app'
        ? ctx.input.appId || ctx.config.appId
        : ctx.input.accountId || ctx.config.accountId;
    if (!id)
      throw createApiServiceError(
        ctx.input.scope === 'app'
          ? 'appId is required. Call manage_apps with action list to discover it.'
          : 'accountId is required. Call who_am_i to discover it.'
      );
    validateQuery(ctx.input);
    let statistics = await client.getStatistics(ctx.input.scope, id, {
      start: ctx.input.start,
      end: ctx.input.end,
      limit: ctx.input.limit,
      direction: ctx.input.direction,
      unit: ctx.input.unit
    });
    return {
      output: { statistics },
      message: `Retrieved **${statistics.length}** ${ctx.input.scope} statistics record(s).`
    };
  })
  .build();
