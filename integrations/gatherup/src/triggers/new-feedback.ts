import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newFeedback = SlateTrigger.create(spec, {
  name: 'New Feedback',
  key: 'new_feedback',
  description:
    'Triggers when new first-party feedback is received through GatherUp for any monitored business.'
})
  .input(
    z.object({
      feedbackId: z.string().describe('Unique feedback identifier'),
      businessId: z.string().optional().describe('Business ID'),
      rating: z.any().optional().describe('Star rating'),
      recommend: z.any().optional().describe('NPS recommendation score'),
      author: z.string().optional().describe('Author name'),
      reviewBody: z.string().optional().describe('Feedback text content'),
      reviewDate: z.string().optional().describe('Date of feedback'),
      visible: z.any().optional().describe('Visibility status'),
      customerId: z.string().optional().describe('Customer ID')
    })
  )
  .output(
    z.object({
      feedbackId: z.string().describe('Feedback identifier'),
      businessId: z.string().optional().describe('Business ID'),
      rating: z.any().optional().describe('Star rating'),
      recommend: z.any().optional().describe('NPS recommendation score'),
      author: z.string().optional().describe('Author name'),
      reviewBody: z.string().optional().describe('Feedback text content'),
      reviewDate: z.string().optional().describe('Date of feedback'),
      visible: z.any().optional().describe('Visibility status'),
      customerId: z.string().optional().describe('Customer ID')
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

      let data = await client.getFeedbacks({
        from: fromDate,
        to: toDate,
        aggregateResponse: 1
      });

      let count =
        typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
      let inputs: Record<string, unknown>[] = [];
      let newSeenIds: string[] = [];

      for (let i = 1; i <= count; i++) {
        let feedbackId = String(data[`feedbackId${i}`] ?? '');
        if (feedbackId && !lastSeenIds.includes(feedbackId)) {
          inputs.push({
            feedbackId,
            businessId:
              data[`businessId${i}`] !== undefined
                ? String(data[`businessId${i}`])
                : undefined,
            rating: data[`rating${i}`],
            recommend: data[`recommend${i}`],
            author: data[`author${i}`],
            reviewBody: data[`reviewBody${i}`],
            reviewDate: data[`reviewDate${i}`],
            visible: data[`visible${i}`],
            customerId:
              data[`customerId${i}`] !== undefined ? String(data[`customerId${i}`]) : undefined
          });
        }
        if (feedbackId) {
          newSeenIds.push(feedbackId);
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
        type: 'feedback.received',
        id: ctx.input.feedbackId,
        output: {
          feedbackId: ctx.input.feedbackId,
          businessId: ctx.input.businessId,
          rating: ctx.input.rating,
          recommend: ctx.input.recommend,
          author: ctx.input.author,
          reviewBody: ctx.input.reviewBody,
          reviewDate: ctx.input.reviewDate,
          visible: ctx.input.visible,
          customerId: ctx.input.customerId
        }
      };
    }
  })
  .build();
