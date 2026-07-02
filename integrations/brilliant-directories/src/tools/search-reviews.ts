import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchReviews = SlateTool.create(spec, {
  name: 'Search Reviews',
  key: 'search_reviews',
  description: `Search for reviews in the directory using various criteria.
Returns matching reviews with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reviewId: z.string().optional().describe('Filter by review ID.'),
      userId: z.string().optional().describe('Filter by member ID being reviewed.'),
      query: z.string().optional().describe('Keyword search query.'),
      additionalFilters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional search filters as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      reviews: z.any().describe('The search results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let params: Record<string, any> = {};
    if (ctx.input.reviewId) params.review_id = ctx.input.reviewId;
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.additionalFilters) {
      for (let [key, value] of Object.entries(ctx.input.additionalFilters)) {
        params[key] = value;
      }
    }

    let result = await client.searchReviews(params);

    return {
      output: {
        status: result.status,
        reviews: result.message
      },
      message: `Found reviews matching the search criteria.`
    };
  })
  .build();
