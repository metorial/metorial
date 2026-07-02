import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve DNS query analytics for a NextDNS profile. Query various dimensions including status counts, top domains, block reasons, client IPs, devices, protocols, query types, IP versions, DNSSEC validation, encryption stats, and destination countries or GAFAM companies. Supports date range filtering and optional time series mode.`,
  instructions: [
    'Date range uses "from" and "to" parameters. Accepts ISO 8601, Unix timestamps, or relative values like "-7d", "-24h", "now".',
    'For destinations, set destinationType to "countries" or "gafam".',
    'Enable timeSeries for charted data with configurable interval.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile'),
      dimension: z
        .enum([
          'status',
          'domains',
          'reasons',
          'ips',
          'devices',
          'protocols',
          'queryTypes',
          'ipVersions',
          'dnssec',
          'encryption',
          'destinations'
        ])
        .describe('Analytics dimension to query'),
      from: z
        .string()
        .optional()
        .describe('Start date (ISO 8601, Unix timestamp, or relative like "-7d")'),
      to: z
        .string()
        .optional()
        .describe('End date (ISO 8601, Unix timestamp, or relative like "now")'),
      deviceId: z.string().optional().describe('Filter by device ID'),
      status: z.string().optional().describe('Filter by status (e.g., "blocked")'),
      destinationType: z
        .enum(['countries', 'gafam'])
        .optional()
        .describe('For destinations dimension: "countries" or "gafam"'),
      timeSeries: z.boolean().optional().describe('Enable time series mode for charting'),
      limit: z.number().optional().describe('Maximum number of results (1-500)')
    })
  )
  .output(
    z.object({
      analytics: z.array(z.record(z.string(), z.unknown())).describe('Analytics data entries'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response metadata including pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let { profileId, dimension, timeSeries, destinationType, deviceId, ...params } = ctx.input;

    let endpointDimension = dimension;
    let queryParams: Record<string, string | number | undefined> = {};

    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (deviceId) queryParams.device = deviceId;
    if (params.status) queryParams.status = params.status;
    if (params.limit) queryParams.limit = params.limit;
    if (destinationType) queryParams.type = destinationType;

    let path = timeSeries ? `${endpointDimension};series` : endpointDimension;
    let result = await client.getAnalytics(profileId, path, queryParams);

    let data = result.data || [];

    return {
      output: {
        analytics: Array.isArray(data) ? data : [data],
        meta: result.meta
      },
      message: `Retrieved **${dimension}** analytics for profile \`${profileId}\`. ${Array.isArray(data) ? `${data.length} entries returned.` : ''}`
    };
  })
  .build();
