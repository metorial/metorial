import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

export let linkInsights = SlateTool.create(spec, {
  name: 'FanLink Insights',
  key: 'link_insights',
  description: `Retrieve performance analytics for a FanLink. Returns both an overview summary and optional time-series data with flexible aggregation options.
The overview includes total clicks, clickthroughs, CTR, email stats, RSVPs, and unique visitor counts.
Time-series data supports aggregation by time interval, geography, referrer, and service.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z.number().describe('ID of the FanLink to get insights for'),
      includeTimeSeries: z
        .boolean()
        .optional()
        .describe('Also retrieve time-series analytics data'),
      metric: z
        .enum(['clicks', 'clickthroughs', 'rsvps'])
        .optional()
        .describe('Metric for time-series data (required when includeTimeSeries is true)'),
      startDate: z.string().optional().describe('Start date for time-series (ISO 8601)'),
      endDate: z.string().optional().describe('End date for time-series (ISO 8601)'),
      aggregateInterval: z
        .enum(['hour', 'day', 'week'])
        .optional()
        .describe('Time interval for aggregation'),
      aggregateGeo: z
        .enum(['city', 'country', 'region'])
        .optional()
        .describe('Geographic aggregation level'),
      aggregateByReferrer: z.boolean().optional().describe('Break down by referrer source'),
      aggregateByService: z.boolean().optional().describe('Break down by service/platform'),
      forDistinctFans: z.boolean().optional().describe('Count unique fans only')
    })
  )
  .output(
    z.object({
      overview: z
        .object({
          clicks: z.number().optional().describe('Total clicks'),
          clickthroughs: z.number().optional().describe('Total clickthroughs'),
          ctr: z.number().optional().describe('Click-through rate'),
          emailClicks: z.number().optional().describe('Email capture clicks'),
          emailsSent: z.number().optional().describe('Emails sent'),
          rsvps: z.number().optional().describe('Total RSVPs'),
          uniqueClicks: z.number().optional().describe('Unique clicks'),
          uniqueClickthroughs: z.number().optional().describe('Unique clickthroughs')
        })
        .describe('Summary overview of link performance'),
      timeSeries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Time-series data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });

    let overview = await client.getLinkInsightsOverview(ctx.input.linkId);

    let output: any = {
      overview: {
        clicks: overview?.clicks,
        clickthroughs: overview?.clickthroughs,
        ctr: overview?.ctr,
        emailClicks: overview?.email_clicks,
        emailsSent: overview?.emails_sent,
        rsvps: overview?.rsvps,
        uniqueClicks: overview?.unique_clicks,
        uniqueClickthroughs: overview?.unique_clickthroughs
      }
    };

    if (ctx.input.includeTimeSeries) {
      let timeSeries = await client.getLinkInsights(ctx.input.linkId, {
        metric: ctx.input.metric,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        aggregateInterval: ctx.input.aggregateInterval,
        aggregateGeo: ctx.input.aggregateGeo,
        aggregateByReferrer: ctx.input.aggregateByReferrer,
        aggregateByService: ctx.input.aggregateByService,
        forDistinctFans: ctx.input.forDistinctFans
      });
      output.timeSeries = timeSeries;
    }

    return {
      output,
      message: `FanLink **${ctx.input.linkId}** insights: ${overview?.clicks ?? 0} clicks, ${overview?.clickthroughs ?? 0} clickthroughs, CTR: ${overview?.ctr ?? 'N/A'}.`
    };
  })
  .build();
