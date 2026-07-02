import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Generate a filtered time report from Timely. Filter by date range, users, projects, labels, and teams. Group results by clients, users, labels, days, or teams for aggregated metrics including duration, cost, profit, and profitability.`,
  instructions: [
    'Both since and upto are required to define the date range.',
    'Grouping options: clients, users, labels, days, teams.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      since: z.string().describe('Report start date (YYYY-MM-DD)'),
      upto: z.string().describe('Report end date (YYYY-MM-DD)'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      projectIds: z.array(z.string()).optional().describe('Filter by project IDs'),
      labelIds: z.array(z.string()).optional().describe('Filter by label IDs'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      groupBy: z
        .array(z.enum(['clients', 'users', 'labels', 'days', 'teams']))
        .optional()
        .describe('Group results by these dimensions')
    })
  )
  .output(
    z.object({
      report: z.any().describe('Report data with aggregated metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let report = await client.getFilteredReports({
      since: ctx.input.since,
      upto: ctx.input.upto,
      userIds: ctx.input.userIds,
      projectIds: ctx.input.projectIds,
      labelIds: ctx.input.labelIds,
      teamIds: ctx.input.teamIds,
      groupBy: ctx.input.groupBy
    });

    return {
      output: { report },
      message: `Generated report for **${ctx.input.since}** to **${ctx.input.upto}**.`
    };
  })
  .build();
