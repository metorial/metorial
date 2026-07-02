import { SlateTool } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { spec } from '../spec';

export let getMiningStatisticsTool = SlateTool.create(spec, {
  name: 'Get Mining Statistics',
  key: 'get_mining_statistics',
  description: `Retrieve aggregate mining statistics for a group, the entire account (global), or the 24-hour log. Group statistics return earnings history for a specific group. Global statistics return account-wide earnings history. 24h logs return all worker logs for the last 24 hours.`,
  instructions: [
    'Use scope "group" with a groupName to get group-level stats.',
    'Use scope "global" for account-wide statistics.',
    'Use scope "logs_24h" for 24-hour worker logs across all workers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['group', 'global', 'logs_24h'])
        .describe('Scope of statistics to retrieve'),
      groupName: z.string().optional().describe('Group name (required when scope is "group")'),
      timezone: z.string().optional().describe('Timezone for the data (e.g. "Europe/Berlin")')
    })
  )
  .output(
    z.object({
      scope: z.string().describe('The scope that was queried'),
      groupName: z.string().optional().describe('Group name if group scope was used'),
      entries: z.array(z.record(z.string(), z.any())).describe('Statistics entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MonitoringClient({ accessKey: ctx.auth.accessKey });

    let params: { tz?: string } = {};
    if (ctx.input.timezone) params.tz = ctx.input.timezone;

    ctx.progress(`Fetching ${ctx.input.scope} statistics...`);

    let result: any;
    switch (ctx.input.scope) {
      case 'group':
        if (!ctx.input.groupName) {
          throw new Error('groupName is required when scope is "group"');
        }
        result = await client.getGroupStatistics(ctx.input.groupName, params);
        break;
      case 'global':
        result = await client.getGlobalStatistics(params);
        break;
      case 'logs_24h':
        result = await client.get24hLogs();
        break;
    }

    let entries = Array.isArray(result)
      ? result
      : typeof result === 'object'
        ? Object.values(result)
        : [];

    let scopeLabel =
      ctx.input.scope === 'group' ? `group **${ctx.input.groupName}**` : ctx.input.scope;

    return {
      output: {
        scope: ctx.input.scope,
        groupName: ctx.input.groupName,
        entries: entries as any[]
      },
      message: `Retrieved **${entries.length}** statistics entries for ${scopeLabel}.`
    };
  })
  .build();
