import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getPostInsights = SlateTool.create(spec, {
  name: 'Get Post Insights',
  key: 'get_post_insights',
  description:
    'Retrieve analytics and insights for a Facebook Page post. Returns post-level metrics such as engagement, clicks, reactions, and any explicitly requested Graph API post insight metrics.',
  instructions: [
    'Provide `postId` for the Page post.',
    'Provide `pageId` when the post requires a Page access token.',
    'If `metrics` is omitted, common post engagement metrics are requested.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Facebook Page post ID'),
      pageId: z
        .string()
        .optional()
        .describe('Page ID used to obtain a Page access token when needed'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('List of post insight metric names to retrieve')
    })
  )
  .output(
    z.object({
      insights: z
        .array(
          z.object({
            metricName: z.string().describe('Metric identifier'),
            metricTitle: z.string().describe('Human-readable metric title'),
            period: z.string().describe('Aggregation period'),
            description: z.string().describe('Metric description'),
            values: z
              .array(
                z.object({
                  value: z.any().describe('Metric value'),
                  endTime: z.string().optional().describe('End time of the measurement period')
                })
              )
              .describe('Metric values over time')
          })
        )
        .describe('Post insight metrics')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.metrics && ctx.input.metrics.length === 0) {
      throw facebookServiceError('metrics must include at least one metric when provided');
    }

    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let pageAccessToken = ctx.input.pageId
      ? await client.getPageAccessToken(ctx.input.pageId)
      : undefined;

    let insights = await client.getPostInsights(ctx.input.postId, {
      metric: ctx.input.metrics,
      pageAccessToken
    });

    return {
      output: {
        insights: insights.map(i => ({
          metricName: i.name,
          metricTitle: i.title,
          period: i.period,
          description: i.description,
          values: i.values.map(v => ({
            value: v.value,
            endTime: v.end_time
          }))
        }))
      },
      message: `Retrieved **${insights.length}** insight metric(s) for post **${ctx.input.postId}**.`
    };
  })
  .build();
