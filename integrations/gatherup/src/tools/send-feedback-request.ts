import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendFeedbackRequest = SlateTool.create(spec, {
  name: 'Send Feedback Request',
  key: 'send_feedback_request',
  description: `Send a feedback request to an existing customer via email or SMS. Can send a new request or a rating revision request. Optionally checks threshold limits before sending.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to request feedback from'),
      ratingRevision: z
        .boolean()
        .optional()
        .describe('Send a rating revision request instead of a new one (defaults to true)'),
      checkThreshold: z
        .boolean()
        .optional()
        .describe('Validate threshold limits before sending (throws error if exceeded)'),
      jobId: z.string().optional().describe('Job ID to associate with the feedback request')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.sendFeedbackRequest({
      customerId: ctx.input.customerId,
      ratingRevision: ctx.input.ratingRevision === false ? 0 : 1,
      checkThreshold: ctx.input.checkThreshold ? 1 : 0,
      jobId: ctx.input.jobId
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to send feedback request: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: { success: true },
      message: `Feedback request sent to customer **${ctx.input.customerId}** successfully.`
    };
  })
  .build();
