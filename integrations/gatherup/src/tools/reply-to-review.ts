import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let replyToReview = SlateTool.create(spec, {
  name: 'Reply to Review',
  key: 'reply_to_review',
  description: `Reply to either a first-party feedback (customer reply) or an eligible Google online review. For first-party feedback, supports setting visibility and responding as business owner. For third-party reviews, sends a reply through the authorized Google Business Profile connection.`,
  instructions: [
    'Use replyType "feedback" to reply to first-party feedback collected via GatherUp.',
    'Use replyType "online_review" to reply to eligible Google reviews with an authorized Google Business Profile connection.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      replyType: z
        .enum(['feedback', 'online_review'])
        .describe(
          'Type of reply: "feedback" for first-party, "online_review" for third-party'
        ),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID (required for feedback replies)'),
      reviewId: z
        .number()
        .optional()
        .describe('Review ID (required for online review replies)'),
      content: z.string().describe('Reply content text'),
      title: z.string().optional().describe('Reply title (feedback replies only)'),
      isPublic: z
        .boolean()
        .optional()
        .describe(
          'Whether the reply is publicly visible (feedback replies only, defaults to false)'
        ),
      respondAsOwner: z
        .boolean()
        .optional()
        .describe('Respond as business owner (feedback replies only, defaults to true)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the reply was sent successfully'),
      replyTargetId: z
        .number()
        .optional()
        .describe('ID of the customer or review that was replied to')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.replyType === 'feedback') {
      if (ctx.input.customerId === undefined) {
        throw createApiServiceError('customerId is required for feedback replies');
      }
      let data = await client.replyToCustomerFeedback({
        customerId: ctx.input.customerId,
        content: ctx.input.content,
        title: ctx.input.title,
        visibility: ctx.input.isPublic ? 1 : 0,
        respondAsBusinessOwner: ctx.input.respondAsOwner === false ? 0 : 1
      });

      return {
        output: {
          success: true,
          replyTargetId: data.customerId ?? ctx.input.customerId
        },
        message: `Replied to feedback from customer **${ctx.input.customerId}** successfully.`
      };
    } else {
      if (ctx.input.reviewId === undefined) {
        throw createApiServiceError('reviewId is required for online review replies');
      }
      let data = await client.replyToOnlineReview({
        reviewId: ctx.input.reviewId,
        content: ctx.input.content
      });

      return {
        output: {
          success: true,
          replyTargetId: data.reviewId ?? ctx.input.reviewId
        },
        message: `Replied to online review **${ctx.input.reviewId}** successfully.`
      };
    }
  })
  .build();
