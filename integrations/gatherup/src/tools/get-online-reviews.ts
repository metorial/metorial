import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getOnlineReviews = SlateTool.create(spec, {
  name: 'Get Online Reviews',
  key: 'get_online_reviews',
  description: `Retrieve third-party online reviews from external platforms like Google, Facebook, Yelp, and 50+ others. Filter by business, date range, platform type, and visibility.`,
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
      page: z.number().optional().describe('Page number'),
      platform: z
        .string()
        .optional()
        .describe('Review platform filter (e.g., "google", "yelp", "facebook")'),
      visible: z.boolean().optional().describe('Filter by visibility')
    })
  )
  .output(
    z.object({
      reviews: z
        .array(
          z.object({
            reviewId: z.any().optional().describe('Review identifier'),
            reviewType: z.string().optional().describe('Platform type (e.g., google, yelp)'),
            reviewAuthor: z.string().optional().describe('Review author name'),
            reviewTime: z.string().optional().describe('Review timestamp'),
            reviewRating: z.any().optional().describe('Star rating'),
            reviewContent: z.string().optional().describe('Review text'),
            reviewVisible: z.any().optional().describe('Visibility status'),
            businessId: z.any().optional().describe('Associated business ID')
          })
        )
        .describe('List of online reviews'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Total review count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getOnlineReviews({
      businessId: ctx.input.businessId,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      type: ctx.input.platform,
      visible: ctx.input.visible !== undefined ? (ctx.input.visible ? 1 : 0) : undefined
    });

    let count =
      typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
    let reviews: Record<string, unknown>[] = [];

    for (let i = 1; i <= count; i++) {
      reviews.push({
        reviewId: data[`reviewId${i}`],
        reviewType: data[`reviewType${i}`],
        reviewAuthor: data[`reviewAuthor${i}`],
        reviewTime: data[`reviewTime${i}`],
        reviewRating: data[`reviewRating${i}`],
        reviewContent: data[`reviewContent${i}`],
        reviewVisible: data[`reviewVisible${i}`],
        businessId: data[`businessId${i}`]
      });
    }

    return {
      output: {
        reviews,
        page: data.page ?? 1,
        pages: data.pages ?? 1,
        totalCount: count
      } as any,
      message: `Found **${count}** online review(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
