import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve DNS query analytics for a NextDNS profile. Query various dimensions including status counts, top domains, block reasons, client IPs, devices, protocols, query types, IP versions, DNSSEC validation, encryption stats, and destination countries or GAFAM companies. Supports date range filtering and optional time series mode.`,
  tags: { readOnly: true },
  instructions: [
    'Date range uses "from" and "to" parameters. Accepts ISO 8601, Unix timestamps, or relative values like "-7d", "-24h", "now".',
    'For destinations, set destinationType to "countries" or "gafam".',
    'Enable timeSeries for charted data with configurable interval.',
    'Use meta.pagination.cursor as cursor to retrieve the next page.'
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
      status: z
        .string()
        .optional()
        .describe('For domains: filter by status ("default", "blocked", or "allowed")'),
      destinationType: z
        .enum(['countries', 'gafam'])
        .optional()
        .describe('For destinations dimension: "countries" or "gafam"'),
      timeSeries: z.boolean().optional().describe('Enable time series mode for charting'),
      limit: z.number().optional().describe('Maximum number of results (integer, 1-500)'),
      cursor: z.string().optional().describe('Pagination cursor from meta.pagination.cursor'),
      root: z.boolean().optional().describe('For domains: group by root domain'),
      interval: z
        .string()
        .optional()
        .describe('For timeSeries: window duration, such as "3600" seconds or "1h"'),
      alignment: z
        .enum(['start', 'end', 'clock'])
        .optional()
        .describe('For timeSeries: align windows to the start, end, or clock'),
      timezone: z
        .string()
        .optional()
        .describe('For timeSeries: IANA time zone used with clock alignment'),
      partials: z
        .enum(['none', 'start', 'end', 'all'])
        .optional()
        .describe('For timeSeries: include partial windows at the start, end, or both')
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
    let { profileId, dimension, timeSeries, destinationType, deviceId, root, ...params } =
      ctx.input;

    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 500)
    ) {
      throw createApiServiceError('Analytics limit must be an integer between 1 and 500.', {
        reason: 'nextdns_invalid_analytics_limit'
      });
    }
    if (
      params.status !== undefined &&
      !['default', 'blocked', 'allowed'].includes(params.status)
    ) {
      throw createApiServiceError('Analytics status must be default, blocked, or allowed.', {
        reason: 'nextdns_invalid_analytics_status'
      });
    }
    if (dimension !== 'domains' && (params.status !== undefined || root !== undefined)) {
      throw createApiServiceError('Use status and root only with the domains dimension.', {
        reason: 'nextdns_invalid_analytics_options'
      });
    }
    if (dimension !== 'destinations' && destinationType !== undefined) {
      throw createApiServiceError(
        'Use destinationType only with the destinations dimension.',
        {
          reason: 'nextdns_invalid_analytics_options'
        }
      );
    }
    if (
      !timeSeries &&
      [params.interval, params.alignment, params.timezone, params.partials].some(
        value => value !== undefined
      )
    ) {
      throw createApiServiceError('Enable timeSeries before setting window options.', {
        reason: 'nextdns_invalid_analytics_options'
      });
    }

    let queryParams = {
      ...params,
      device: deviceId,
      type: destinationType,
      root: root === undefined ? undefined : root ? 1 : 0
    };

    let path = timeSeries ? `${dimension};series` : dimension;
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
