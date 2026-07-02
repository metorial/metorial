import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFacebookRecommendations = SlateTool.create(spec, {
  name: 'Get Facebook Recommendations',
  key: 'get_facebook_recommendations',
  description: `Retrieve Facebook recommendations for business locations. Filter by business and date range. Returns recommendation sentiment, author, content, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z
        .string()
        .optional()
        .describe('Filter by business ID (supports comma-separated multiple IDs)'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      recommendations: z
        .array(
          z.object({
            recommendationId: z.string().optional().describe('Recommendation identifier'),
            businessId: z.string().optional().describe('Associated business ID'),
            author: z.string().optional().describe('Recommender name'),
            recommendation: z.string().optional().describe('Sentiment (e.g., "positive")'),
            time: z.string().optional().describe('Timestamp'),
            content: z.string().optional().describe('Recommendation text')
          })
        )
        .describe('List of Facebook recommendations'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getFacebookRecommendations({
      businessId: ctx.input.businessId,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to get Facebook recommendations: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    let recommendations = (data.recommendations ?? []).map((r: any) => ({
      recommendationId: r.id,
      businessId: r.businessId,
      author: r.author,
      recommendation: r.recommendation,
      time: r.time,
      content: r.content
    }));

    let count =
      typeof data.count === 'string' ? Number.parseInt(data.count, 10) : (data.count ?? 0);

    return {
      output: {
        recommendations,
        page: data.page ?? 1,
        pages: data.pages ?? 1,
        totalCount: count
      } as any,
      message: `Found **${count}** Facebook recommendation(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
