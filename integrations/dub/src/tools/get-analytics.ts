import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve analytics for your links, workspace, or specific resources. Get click, lead, and sale data grouped by various dimensions like country, device, browser, referrer, timeseries, and more.
Use \`groupBy\` to control the aggregation (e.g., "count" for totals, "timeseries" for time-based data, "countries" for geographic breakdown).`,
  instructions: [
    'Use groupBy="count" for simple totals of clicks, leads, sales',
    'Use groupBy="timeseries" for time-series data points',
    'Filter by linkId, domain, tagId, etc. to narrow results',
    'Default interval is 24h; use interval or start/end for custom ranges'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      event: z
        .enum(['clicks', 'leads', 'sales', 'composite'])
        .optional()
        .describe('Event type to analyze (default: clicks)'),
      groupBy: z
        .enum([
          'count',
          'timeseries',
          'continents',
          'regions',
          'countries',
          'cities',
          'devices',
          'browsers',
          'os',
          'trigger',
          'referers',
          'referer_urls',
          'top_links',
          'top_urls',
          'top_domains',
          'top_folders',
          'top_link_tags',
          'utm_sources',
          'utm_mediums',
          'utm_campaigns',
          'utm_terms',
          'utm_contents',
          'top_partners'
        ])
        .optional()
        .describe('How to group/aggregate the analytics data'),
      linkId: z.string().optional().describe('Filter by specific link ID'),
      externalId: z.string().optional().describe('Filter by external ID (prefix with ext_)'),
      domain: z.string().optional().describe('Filter by domain'),
      tagId: z.string().optional().describe('Filter by tag ID'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      partnerId: z.string().optional().describe('Filter by partner ID'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      interval: z
        .enum(['24h', '7d', '30d', '90d', '1y', 'mtd', 'qtd', 'ytd', 'all'])
        .optional()
        .describe('Time interval (default: 24h)'),
      start: z
        .string()
        .optional()
        .describe('Start date/time in ISO format (overrides interval)'),
      end: z.string().optional().describe('End date/time in ISO format'),
      timezone: z.string().optional().describe('IANA timezone code (e.g., America/New_York)'),
      country: z.string().optional().describe('Filter by 2-letter country code'),
      device: z.string().optional().describe('Filter by device type'),
      browser: z.string().optional().describe('Filter by browser name'),
      os: z.string().optional().describe('Filter by operating system'),
      referer: z.string().optional().describe('Filter by referer hostname'),
      url: z.string().optional().describe('Filter by destination URL'),
      saleType: z.enum(['new', 'recurring']).optional().describe('Filter sales by type')
    })
  )
  .output(
    z.object({
      analytics: z.any().describe('Analytics data; shape depends on groupBy parameter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAnalytics({
      event: ctx.input.event,
      groupBy: ctx.input.groupBy,
      linkId: ctx.input.linkId,
      externalId: ctx.input.externalId,
      domain: ctx.input.domain,
      tagId: ctx.input.tagId,
      folderId: ctx.input.folderId,
      partnerId: ctx.input.partnerId,
      customerId: ctx.input.customerId,
      interval: ctx.input.interval,
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      country: ctx.input.country,
      device: ctx.input.device,
      browser: ctx.input.browser,
      os: ctx.input.os,
      referer: ctx.input.referer,
      url: ctx.input.url,
      saleType: ctx.input.saleType
    });

    let groupBy = ctx.input.groupBy ?? 'count';
    let message = `Retrieved **${groupBy}** analytics`;
    if (ctx.input.linkId) message += ` for link \`${ctx.input.linkId}\``;
    if (ctx.input.interval) message += ` over ${ctx.input.interval}`;

    return {
      output: { analytics: data },
      message
    };
  })
  .build();
