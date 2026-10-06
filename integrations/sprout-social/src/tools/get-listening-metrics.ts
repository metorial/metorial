import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, listeningValues, range } from '../lib/client';
import { customerIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getListeningMetrics = SlateTool.create(spec, {
  name: 'Get Listening Metrics',
  key: 'get_listening_metrics',
  description: `Retrieve aggregated metrics for a Sprout Social Listening Topic. Returns metrics such as total engagement, likes, replies, shares, impressions, volume, sentiment counts, and author counts. Results can be broken down by time period, sentiment, network, media type, and location.`,
  instructions: [
    'Get topic IDs from the Get Metadata tool (resourceType: "topics").',
    'A created_time filter is required.',
    'Available metrics: "replies", "likes", "shares_count", "impressions", "volume", "engagement".',
    'Available dimensions: "created_time.by(day)", "created_time.by(month)", "sentiment", "network", "visual_media.media_type", "location.country", "location.city".'
  ],
  constraints: [
    'Listening data from X (Twitter) is currently unavailable.',
    'All results are returned in a single response (no pagination).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: customerIdSchema,
      topicId: z.string().describe('Listening topic ID.'),
      startTime: z.string().describe('Start time in ISO 8601 or YYYY-MM-DD format.'),
      endTime: z.string().describe('End time in ISO 8601 or YYYY-MM-DD format.'),
      metrics: z
        .array(z.string())
        .describe(
          'Metrics to aggregate (e.g., "likes", "replies", "shares_count", "impressions", "volume").'
        ),
      dimensions: z
        .array(z.string())
        .optional()
        .describe(
          'Dimensions to break down metrics by (e.g., "created_time.by(day)", "sentiment", "network").'
        ),
      networks: z.array(z.string()).optional().describe('Networks to filter by.'),
      sentiment: z.array(z.string()).optional().describe('Sentiment to filter by.'),
      timezone: z.string().optional().describe('IANA timezone (e.g., "America/Chicago").')
    })
  )
  .output(
    z.object({
      metricsData: z
        .array(
          z.object({
            dimensions: z.any().optional().describe('Dimension values for the data point.'),
            metrics: z.any().describe('Aggregated metric values.')
          })
        )
        .describe('Array of aggregated metric data points.')
    })
  )
  .handleInvocation(async ctx => {
    range(ctx.input.startTime, ctx.input.endTime);
    const networks = listeningValues(ctx.input.networks, 'network');
    const sentiment = listeningValues(ctx.input.sentiment, 'sentiment');
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.input.customerId ?? ctx.config.customerId
    });

    let filters: string[] = [`created_time.in(${ctx.input.startTime}..${ctx.input.endTime})`];
    if (networks?.length) {
      filters.push(`network.eq(${networks.join(',')})`);
    }
    if (sentiment?.length) {
      filters.push(`sentiment.eq(${sentiment.join(',')})`);
    }

    let result = await client.getListeningTopicMetrics(ctx.input.topicId, {
      filters,
      metrics: ctx.input.metrics,
      dimensions: ctx.input.dimensions,
      timezone: ctx.input.timezone
    });

    let metricsData = result.data.map((item: any) => ({
      dimensions: item.dimensions,
      metrics: item.metrics
    }));

    return {
      output: { metricsData },
      message: `Retrieved **${metricsData.length}** aggregated metric data points for the selected topic.`
    };
  });
