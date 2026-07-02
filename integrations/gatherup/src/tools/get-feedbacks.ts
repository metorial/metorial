import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFeedbacks = SlateTool.create(spec, {
  name: 'Get Feedbacks',
  key: 'get_feedbacks',
  description: `Retrieve first-party feedback collected through GatherUp. Filter by business, date range, NPS score range, customer, and visibility. Optionally includes survey question results.`,
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
      minRecommend: z.number().optional().describe('Minimum NPS recommendation score filter'),
      maxRecommend: z.number().optional().describe('Maximum NPS recommendation score filter'),
      showSurvey: z.boolean().optional().describe('Include survey question results'),
      customerId: z.number().optional().describe('Filter for a specific customer'),
      visible: z
        .boolean()
        .optional()
        .describe('Filter by visibility (true=visible, false=hidden)')
    })
  )
  .output(
    z.object({
      feedbacks: z
        .array(
          z.object({
            feedbackId: z.any().optional().describe('Feedback identifier'),
            businessId: z.any().optional().describe('Associated business ID'),
            rating: z.any().optional().describe('Star rating'),
            recommend: z.any().optional().describe('NPS recommendation score'),
            author: z.string().optional().describe('Author name'),
            reviewBody: z.string().optional().describe('Feedback text content'),
            reviewDate: z.string().optional().describe('Date of feedback'),
            visible: z.any().optional().describe('Visibility status'),
            customerId: z.any().optional().describe('Customer ID'),
            customerJobId: z.string().optional().describe('Job identifier'),
            customerTags: z.string().optional().describe('Customer tags')
          })
        )
        .describe('List of feedbacks'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Total feedback count')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getFeedbacks({
      businessId: ctx.input.businessId,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      minRecommend: ctx.input.minRecommend,
      maxRecommend: ctx.input.maxRecommend,
      showSurvey: ctx.input.showSurvey ? 1 : 0,
      customerId: ctx.input.customerId,
      visible: ctx.input.visible !== undefined ? (ctx.input.visible ? 1 : 0) : undefined
    });

    let count =
      typeof data.count === 'number' ? data.count : Number.parseInt(data.count || '0', 10);
    let feedbacks: Record<string, unknown>[] = [];

    for (let i = 1; i <= count; i++) {
      feedbacks.push({
        feedbackId: data[`feedbackId${i}`],
        businessId: data[`businessId${i}`],
        rating: data[`rating${i}`],
        recommend: data[`recommend${i}`],
        author: data[`author${i}`],
        reviewBody: data[`reviewBody${i}`],
        reviewDate: data[`reviewDate${i}`],
        visible: data[`visible${i}`],
        customerId: data[`customerId${i}`],
        customerJobId: data[`customerJobId${i}`],
        customerTags: data[`customerTags${i}`]
      });
    }

    return {
      output: {
        feedbacks,
        page: data.page ?? 1,
        pages: data.pages ?? 1,
        totalCount: count
      } as any,
      message: `Found **${count}** feedback(s) (page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
