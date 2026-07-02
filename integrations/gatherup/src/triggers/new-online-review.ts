import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newOnlineReview = SlateTrigger.create(spec, {
  name: 'New Online Review',
  key: 'new_online_review',
  description:
    'Triggers when a new third-party online review is detected from platforms like Google, Facebook, Yelp, etc.'
})
  .input(
    z.object({
      reviewId: z.string().describe('Unique review identifier'),
      reviewType: z
        .string()
        .optional()
        .describe('Platform type (e.g., google, yelp, facebook)'),
      reviewAuthor: z.string().optional().describe('Review author name'),
      reviewTime: z.string().optional().describe('Review timestamp'),
      reviewRating: z.any().optional().describe('Star rating'),
      reviewContent: z.string().optional().describe('Review text'),
      businessId: z.string().optional().describe('Associated business ID')
    })
  )
  .output(
    z.object({
      reviewId: z.string().describe('Review identifier'),
      reviewType: z.string().optional().describe('Platform type'),
      reviewAuthor: z.string().optional().describe('Author name'),
      reviewTime: z.string().optional().describe('Review timestamp'),
      reviewRating: z.any().optional().describe('Star rating'),
      reviewContent: z.string().optional().describe('Review text'),
      businessId: z.string().optional().describe('Associated business ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let lastPolledDate = ctx.state?.lastPolledDate as string | undefined;
      let lastSeenIds = (ctx.state?.lastSeenIds as string[] | undefined) ?? [];

      let now = new Date();
      let fromDate =
        lastPolledDate ??
        new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let toDate = now.toISOString().split('T')[0];

      let data = await client.getOnlineReviews({
        from: fromDate,
        to: toDate,
        aggregateResponse: 1
      });

      let count =
        typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
      let inputs: Record<string, unknown>[] = [];
      let newSeenIds: string[] = [];

      for (let i = 1; i <= count; i++) {
        let reviewId = String(data[`reviewId${i}`] ?? '');
        if (reviewId && !lastSeenIds.includes(reviewId)) {
          inputs.push({
            reviewId,
            reviewType: data[`reviewType${i}`],
            reviewAuthor: data[`reviewAuthor${i}`],
            reviewTime: data[`reviewTime${i}`],
            reviewRating: data[`reviewRating${i}`],
            reviewContent: data[`reviewContent${i}`],
            businessId:
              data[`businessId${i}`] !== undefined ? String(data[`businessId${i}`]) : undefined
          });
        }
        if (reviewId) {
          newSeenIds.push(reviewId);
        }
      }

      return {
        inputs: inputs as any,
        updatedState: {
          lastPolledDate: toDate,
          lastSeenIds: newSeenIds.slice(0, 500)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'online_review.received',
        id: ctx.input.reviewId,
        output: {
          reviewId: ctx.input.reviewId,
          reviewType: ctx.input.reviewType,
          reviewAuthor: ctx.input.reviewAuthor,
          reviewTime: ctx.input.reviewTime,
          reviewRating: ctx.input.reviewRating,
          reviewContent: ctx.input.reviewContent,
          businessId: ctx.input.businessId
        }
      };
    }
  })
  .build();
