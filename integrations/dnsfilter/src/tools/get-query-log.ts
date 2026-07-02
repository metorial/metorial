import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQueryLog = SlateTool.create(spec, {
  name: 'Get Query Log',
  key: 'get_query_log',
  description: `Retrieve raw DNS query logs for detailed analysis. Shows individual DNS queries with domain, result (allowed/blocked), category, site, and roaming client details. Useful for troubleshooting, security investigations, and audit trails.`,
  tags: {
    readOnly: true
  },
  constraints: ['Query logs are limited to a 72-hour time range per request.']
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date/time in ISO 8601 format'),
      endDate: z.string().optional().describe('End date/time in ISO 8601 format'),
      domain: z.string().optional().describe('Filter by fully qualified domain name'),
      siteId: z.string().optional().describe('Filter by network/site ID'),
      organizationId: z.string().optional().describe('Filter by organization ID'),
      roamingClientId: z.string().optional().describe('Filter by roaming client ID'),
      result: z.enum(['allowed', 'blocked']).optional().describe('Filter by query result'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional filter parameters')
    })
  )
  .output(
    z.object({
      queryLog: z.any().describe('DNS query log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = {};

    if (ctx.input.startDate) params.start = ctx.input.startDate;
    if (ctx.input.endDate) params.end = ctx.input.endDate;
    if (ctx.input.domain) params.domain = ctx.input.domain;
    if (ctx.input.siteId) params.site_id = ctx.input.siteId;
    if (ctx.input.organizationId) params.organization_id = ctx.input.organizationId;
    if (ctx.input.roamingClientId) params.roaming_client_id = ctx.input.roamingClientId;
    if (ctx.input.result) params.result = ctx.input.result;
    if (ctx.input.filters) Object.assign(params, ctx.input.filters);

    let queryLog = await client.getQueryLog(params);

    return {
      output: { queryLog },
      message: `Retrieved query log entries.`
    };
  })
  .build();
