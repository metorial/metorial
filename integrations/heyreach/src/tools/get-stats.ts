import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStats = SlateTool.create(spec, {
  name: 'Get Overall Stats',
  key: 'get_overall_stats',
  description: `Retrieve comprehensive analytics and performance statistics across your HeyReach campaigns. Includes metrics such as total leads, contacted count, replied count, connected count, response rate, and connection rate. Supports filtering by date range, accounts, and campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Start date for stats (ISO 8601 format)'),
      dateTo: z.string().optional().describe('End date for stats (ISO 8601 format)'),
      accountIds: z.array(z.number()).optional().describe('Filter by LinkedIn account IDs'),
      campaignIds: z.array(z.number()).optional().describe('Filter by campaign IDs')
    })
  )
  .output(
    z.object({
      stats: z.any().describe('Overall performance statistics and metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOverallStats({
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      accountIds: ctx.input.accountIds,
      campaignIds: ctx.input.campaignIds
    });

    let stats = result?.data ?? result;

    return {
      output: { stats },
      message: `Retrieved overall stats.`
    };
  })
  .build();
