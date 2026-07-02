import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryAnalyticsTool = SlateTool.create(spec, {
  name: 'Query Analytics',
  key: 'query_analytics',
  description: `Query Cloudflare's GraphQL Analytics API for traffic, DNS, firewall, and performance data. Supports flexible GraphQL queries to retrieve analytics for zones and accounts.`,
  instructions: [
    "Use Cloudflare's GraphQL schema. Common datasets: httpRequests1dGroups, httpRequests1hGroups, firewallEventsAdaptiveGroups.",
    'Queries must include a filter with zone tag or account tag and a datetime range.',
    'Example: `{ viewer { zones(filter: { zoneTag: "ZONE_ID" }) { httpRequests1dGroups(limit: 7, filter: { date_gt: "2024-01-01" }) { sum { requests } dimensions { date } } } } }`'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('GraphQL query string'),
      variables: z.record(z.string(), z.any()).optional().describe('GraphQL query variables')
    })
  )
  .output(
    z.object({
      data: z.any().describe('GraphQL response data'),
      errors: z.array(z.any()).optional().describe('GraphQL errors if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let response = await client.queryAnalytics(ctx.input.query, ctx.input.variables);

    return {
      output: {
        data: response.data,
        errors: Array.isArray(response.errors) ? response.errors : undefined
      },
      message: response.errors?.length
        ? `Query completed with **${response.errors.length}** error(s).`
        : 'Analytics query completed successfully.'
    };
  })
  .build();
