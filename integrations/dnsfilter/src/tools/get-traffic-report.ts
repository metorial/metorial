import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrafficReport = SlateTool.create(spec, {
  name: 'Get Traffic Report',
  key: 'get_traffic_report',
  description: `Retrieve total DNS request counts over time. Filter by network, organization, or roaming client to monitor usage and filtering results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date/time in ISO 8601 format'),
      endDate: z.string().optional().describe('End date/time in ISO 8601 format'),
      siteId: z.string().optional().describe('Filter by network/site ID'),
      organizationId: z.string().optional().describe('Filter by organization ID'),
      roamingClientId: z.string().optional().describe('Filter by roaming client ID'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional filter parameters')
    })
  )
  .output(
    z.object({
      report: z.any().describe('Traffic report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = {};

    if (ctx.input.startDate) params.from = ctx.input.startDate;
    if (ctx.input.endDate) params.to = ctx.input.endDate;
    if (ctx.input.siteId) params.network_ids = ctx.input.siteId;
    if (ctx.input.organizationId) params.organization_ids = ctx.input.organizationId;
    if (ctx.input.roamingClientId) params.agent_ids = ctx.input.roamingClientId;
    if (ctx.input.filters) Object.assign(params, ctx.input.filters);

    let report = await client.getTrafficReport(params);

    return {
      output: { report },
      message: `Retrieved traffic report.`
    };
  })
  .build();
