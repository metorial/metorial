import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReports = SlateTool.create(spec, {
  name: 'Get Reports',
  key: 'get_reports',
  description: `Retrieve support performance reports. Includes average first response time, ticket counts, and reply counts. Filter by user, team, label, and date range (max 30 days window).`,
  tags: {
    readOnly: true
  },
  constraints: ['Report data covers a maximum 30-day window.']
})
  .input(
    z.object({
      reportType: z
        .enum(['avg_first_response_time', 'tickets_count', 'replies_count'])
        .describe('Type of report to retrieve'),
      user: z.string().optional().describe('Filter by user ID'),
      team: z.string().optional().describe('Filter by team ID'),
      label: z.string().optional().describe('Filter by label name'),
      since: z
        .string()
        .optional()
        .describe('Start date for the report period (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('The type of report returned'),
      reportData: z.any().describe('The report data returned by SupportBee')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let options = {
      user: ctx.input.user,
      team: ctx.input.team,
      label: ctx.input.label,
      since: ctx.input.since
    };

    let reportData: any;
    switch (ctx.input.reportType) {
      case 'avg_first_response_time':
        reportData = await client.getAvgFirstResponseTime(options);
        break;
      case 'tickets_count':
        reportData = await client.getTicketsCount(options);
        break;
      case 'replies_count':
        reportData = await client.getRepliesCount(options);
        break;
    }

    return {
      output: { reportType: ctx.input.reportType, reportData },
      message: `Retrieved **${ctx.input.reportType}** report`
    };
  })
  .build();
