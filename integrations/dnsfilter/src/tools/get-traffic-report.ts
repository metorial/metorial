import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrafficReport = SlateTool.create(spec, {
  name: 'Get Traffic Report',
  key: 'get_traffic_report',
  description: `Retrieve DNS traffic analytics and reports. Provides total requests and threats over time, requests by category or domain, top requested domains, and other traffic metrics. Useful for security monitoring, compliance reporting, and understanding network usage patterns.`,
  tags: {
    readOnly: true
  },
  constraints: ['Query log requests are limited to 72-hour time ranges.']
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

    if (ctx.input.startDate) params.start = ctx.input.startDate;
    if (ctx.input.endDate) params.end = ctx.input.endDate;
    if (ctx.input.siteId) params.site_id = ctx.input.siteId;
    if (ctx.input.organizationId) params.organization_id = ctx.input.organizationId;
    if (ctx.input.roamingClientId) params.roaming_client_id = ctx.input.roamingClientId;
    if (ctx.input.filters) Object.assign(params, ctx.input.filters);

    let report = await client.getTrafficReport(params);

    return {
      output: { report },
      message: `Retrieved traffic report.`
    };
  })
  .build();
