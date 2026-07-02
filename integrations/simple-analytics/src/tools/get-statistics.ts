import { SlateTool } from 'slates';
import { z } from 'zod';
import { getStats } from '../lib/stats';
import { spec } from '../spec';

let histogramEntrySchema = z.object({
  date: z.string().describe('Date or datetime label for the histogram bucket'),
  pageviews: z.number().optional().describe('Number of page views in this interval'),
  visitors: z.number().optional().describe('Number of unique visitors in this interval')
});

export let getStatisticsTool = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve aggregated website analytics statistics from Simple Analytics. Returns metrics such as page views, visitors, top pages, countries, referrers, UTM parameters, browsers, operating systems, device types, and time-series histogram data. Supports filtering by page path, country, referrer, UTM parameters, browser, OS, and device type. Dates support relative placeholders like \`today\`, \`yesterday\`, and \`today-30d\`.`,
  instructions: [
    'Use the "fields" parameter to select which metrics to retrieve. If omitted, only totals are returned.',
    'Wildcard filtering is supported — e.g. set page to "/blog*" to filter by path prefix.',
    'For histogram data, include "histogram" in fields and optionally set "interval" (hour, day, week, month, year).'
  ],
  constraints: [
    'The limit parameter ranges from 1 to 1000.',
    'Histogram interval "hour" only works for date ranges of 1 day or less.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .array(
          z.enum([
            'pageviews',
            'visitors',
            'histogram',
            'pages',
            'countries',
            'referrers',
            'utm_sources',
            'utm_mediums',
            'utm_campaigns',
            'utm_contents',
            'utm_terms',
            'browser_names',
            'os_names',
            'device_types',
            'seconds_on_page'
          ])
        )
        .optional()
        .describe(
          'Analytics fields to retrieve. If omitted, only pageviews and visitors totals are returned.'
        ),
      start: z
        .string()
        .optional()
        .describe(
          'Start date in YYYY-MM-DD format or a relative placeholder (e.g. "today-30d"). Defaults to 1 month ago.'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End date in YYYY-MM-DD format or a relative placeholder (e.g. "today"). Defaults to today.'
        ),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone identifier (e.g. "Europe/Amsterdam", "America/New_York").'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results per dimension field (1–1000).'),
      interval: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe(
          'Histogram bucket interval. Only used when "histogram" is included in fields.'
        ),
      page: z
        .string()
        .optional()
        .describe('Filter by page path. Supports wildcards (e.g. "/blog*").'),
      country: z.string().optional().describe('Filter by country code (e.g. "NL", "US").'),
      referrer: z
        .string()
        .optional()
        .describe('Filter by referrer domain (e.g. "google.com").'),
      utmSource: z.string().optional().describe('Filter by UTM source.'),
      utmMedium: z.string().optional().describe('Filter by UTM medium.'),
      utmCampaign: z.string().optional().describe('Filter by UTM campaign.'),
      utmContent: z.string().optional().describe('Filter by UTM content.'),
      utmTerm: z.string().optional().describe('Filter by UTM term.'),
      browserName: z
        .string()
        .optional()
        .describe('Filter by browser name (e.g. "Chrome", "Firefox").'),
      osName: z
        .string()
        .optional()
        .describe('Filter by operating system name (e.g. "Windows", "macOS").'),
      deviceType: z
        .string()
        .optional()
        .describe('Filter by device type (e.g. "desktop", "mobile", "tablet").')
    })
  )
  .output(
    z.object({
      pageviews: z.number().optional().describe('Total page views in the date range'),
      visitors: z.number().optional().describe('Total unique visitors in the date range'),
      histogram: z
        .array(histogramEntrySchema)
        .optional()
        .describe('Time-series data broken down by the chosen interval'),
      pages: z
        .array(
          z.object({
            value: z.string().describe('Page path'),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Top pages by traffic'),
      countries: z
        .array(
          z.object({
            value: z.string().describe('Country code'),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Visitors by country'),
      referrers: z
        .array(
          z.object({
            value: z.string().describe('Referrer domain'),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by referrer source'),
      utmSources: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by UTM source'),
      utmMediums: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by UTM medium'),
      utmCampaigns: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by UTM campaign'),
      utmContents: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by UTM content'),
      utmTerms: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by UTM term'),
      browserNames: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by browser'),
      osNames: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by operating system'),
      deviceTypes: z
        .array(
          z.object({
            value: z.string(),
            pageviews: z.number().optional(),
            visitors: z.number().optional()
          })
        )
        .optional()
        .describe('Traffic by device type'),
      secondsOnPage: z.number().optional().describe('Median time on page in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let data = await getStats(
      { token: ctx.auth.token, userId: ctx.auth.userId },
      {
        hostname: ctx.config.hostname,
        fields: ctx.input.fields,
        start: ctx.input.start,
        end: ctx.input.end,
        timezone: ctx.input.timezone,
        limit: ctx.input.limit,
        interval: ctx.input.interval,
        page: ctx.input.page,
        country: ctx.input.country,
        referrer: ctx.input.referrer,
        utmSource: ctx.input.utmSource,
        utmMedium: ctx.input.utmMedium,
        utmCampaign: ctx.input.utmCampaign,
        utmContent: ctx.input.utmContent,
        utmTerm: ctx.input.utmTerm,
        browserName: ctx.input.browserName,
        osName: ctx.input.osName,
        deviceType: ctx.input.deviceType
      }
    );

    let output: Record<string, unknown> = {};
    if (data.pageviews !== undefined) output.pageviews = data.pageviews;
    if (data.visitors !== undefined) output.visitors = data.visitors;
    if (data.histogram) output.histogram = data.histogram;
    if (data.pages) output.pages = data.pages;
    if (data.countries) output.countries = data.countries;
    if (data.referrers) output.referrers = data.referrers;
    if (data.utm_sources) output.utmSources = data.utm_sources;
    if (data.utm_mediums) output.utmMediums = data.utm_mediums;
    if (data.utm_campaigns) output.utmCampaigns = data.utm_campaigns;
    if (data.utm_contents) output.utmContents = data.utm_contents;
    if (data.utm_terms) output.utmTerms = data.utm_terms;
    if (data.browser_names) output.browserNames = data.browser_names;
    if (data.os_names) output.osNames = data.os_names;
    if (data.device_types) output.deviceTypes = data.device_types;
    if (data.seconds_on_page !== undefined) output.secondsOnPage = data.seconds_on_page;

    let parts: string[] = [];
    if (output.pageviews !== undefined) parts.push(`**${output.pageviews}** page views`);
    if (output.visitors !== undefined) parts.push(`**${output.visitors}** visitors`);
    let dateRange = `${ctx.input.start || 'last 30 days'} to ${ctx.input.end || 'today'}`;
    let summary =
      parts.length > 0
        ? `Retrieved ${parts.join(' and ')} for **${ctx.config.hostname}** (${dateRange}).`
        : `Retrieved statistics for **${ctx.config.hostname}** (${dateRange}).`;

    return {
      output: output as any,
      message: summary
    };
  })
  .build();
