import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClickAnalytics = SlateTool.create(spec, {
  name: 'Get Click Analytics',
  key: 'get_click_analytics',
  description: `Retrieves click analytics time-series data for one or more links. Returns click counts over time, optionally filtered by date range, country, browser, platform, referrer, or ISP. Can pivot data by link for comparison.`,
  instructions: [
    'Use linkId for a single link or linkIds (comma-separated) for multiple links.',
    'Date format for start/end: YYYY-MM-DD.',
    'Set pivot to "link_id" to get per-link breakdowns in one request.',
    'Set unique to true to count only unique visitors.'
  ],
  constraints: [
    'Rate limited to 50 requests per hour per workspace.',
    'Results may be cached for up to 3 hours.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.number().optional().describe('Filter by a single link ID'),
      linkIds: z.string().optional().describe('Filter by multiple link IDs (comma-separated)'),
      start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date (YYYY-MM-DD)'),
      country: z.string().optional().describe('Filter by country (ISO 3166-1 alpha-2 code)'),
      browser: z.string().optional().describe('Filter by browser name'),
      platform: z.string().optional().describe('Filter by platform/OS'),
      referer: z.string().optional().describe('Filter by referrer'),
      isp: z.string().optional().describe('Filter by ISP'),
      bots: z.boolean().optional().describe('Include bot traffic (default: false)'),
      unique: z.boolean().optional().describe('Count only unique visitors'),
      pivot: z.string().optional().describe('Pivot by dimension (e.g., "link_id")'),
      timezone: z.string().optional().describe('Timezone for date grouping'),
      frequency: z.enum(['day', 'hour']).optional().describe('Time granularity (default: day)')
    })
  )
  .output(
    z.object({
      traffic: z
        .array(
          z.object({
            date: z.string().describe('Date or datetime of the data point'),
            clicks: z.any().describe('Click count or per-link click map when pivoting')
          })
        )
        .describe('Time-series click data'),
      links: z.array(z.any()).optional().describe('Link metadata when using pivot mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.getClickAnalytics(ctx.input);

    let traffic: Array<{ date: string; clicks: any }> = [];
    if (Array.isArray(result.traffic)) {
      traffic = result.traffic.map((point: any) => ({
        date: point.t || point.date,
        clicks: point.y || point.clicks
      }));
    } else if (Array.isArray(result.data)) {
      traffic = result.data.map((point: any) => ({
        date: point.date,
        clicks: point.clicks
      }));
    } else if (Array.isArray(result)) {
      traffic = result.map((point: any) => ({
        date: point.t || point.date,
        clicks: point.y || point.clicks
      }));
    }

    return {
      output: {
        traffic,
        links: result.links
      },
      message: `Retrieved **${traffic.length}** data points of click analytics`
    };
  })
  .build();
