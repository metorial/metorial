import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRankTrackerData = SlateTool.create(spec, {
  name: 'Get Rank Tracker Data',
  key: 'get_rank_tracker_data',
  description: `Retrieve rank tracking data for a Rank Tracker project. Supports fetching the project overview (visibility, average position), competitor comparisons, and SERP-level keyword data.
Use to monitor keyword rankings over time and track SEO progress.`,
  instructions: [
    'Set "reportType" to choose between project overview, competitors overview, or detailed SERP data.',
    'Rank Tracker endpoints are free (no API unit cost).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Rank Tracker project ID'),
      reportType: z
        .enum(['overview', 'competitors', 'serp'])
        .optional()
        .describe('Type of rank tracker report. Defaults to "overview".'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z
        .string()
        .optional()
        .describe('Filter expression in Ahrefs filter syntax (applicable for "serp" report)'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (applicable for "serp" and "competitors" reports)'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      rankData: z.any().describe('Rank tracker data for the specified project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reportType = ctx.input.reportType || 'overview';

    let result: any;
    switch (reportType) {
      case 'competitors':
        result = await client.getRankTrackerCompetitorsOverview({
          project_id: ctx.input.projectId,
          select: ctx.input.select,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
      case 'serp':
        result = await client.getRankTrackerSerpOverview({
          project_id: ctx.input.projectId,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
      default:
        result = await client.getRankTrackerOverview({
          project_id: ctx.input.projectId,
          select: ctx.input.select
        });
    }

    return {
      output: {
        rankData: result
      },
      message: `Retrieved rank tracker ${reportType} for project **${ctx.input.projectId}**.`
    };
  })
  .build();
