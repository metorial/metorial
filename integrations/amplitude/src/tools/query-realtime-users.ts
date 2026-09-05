import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAnalyticsClient } from '../lib/analytics-client';
import { spec } from '../spec';
import { tags } from './project-analytics-schemas';

export const queryRealtimeUsersTool = SlateTool.create(spec, {
  name: 'Query Real-time Users',
  key: 'query_realtime_users',
  tags,
  description:
    'Retrieve today and yesterday active-user time series in five-minute buckets, preserving provider labels and missing values. Call directly with an empty object using the project API key and secret. These are bucketed active users, not currently connected or concurrent users.'
})
  .authMethods(['api_key_secret'])
  .input(z.object({}))
  .output(
    z.object({
      series: z.array(z.array(z.number().nullable())),
      seriesLabels: z.array(z.string()),
      xValues: z.array(z.string()),
      intervalMinutes: z.literal(5)
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      ...(await createAnalyticsClient(ctx).queryRealtimeUsers()),
      intervalMinutes: 5 as const
    },
    message: 'Retrieved active users in five-minute buckets for today and yesterday.'
  }))
  .build();
