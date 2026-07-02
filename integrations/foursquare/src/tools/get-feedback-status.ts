import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFeedbackStatus = SlateTool.create(spec, {
  name: 'Get Feedback Status',
  key: 'get_feedback_status',
  description: `Check the status of a previously submitted place feedback (edit proposal or flag). Use the feedback ID returned from the Submit Place Feedback tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      feedbackId: z.string().describe('Feedback submission ID to check')
    })
  )
  .output(
    z.object({
      feedbackId: z.string().describe('Feedback submission ID'),
      status: z.string().optional().describe('Current status of the feedback'),
      response: z.any().optional().describe('Additional response details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getFeedbackStatus(ctx.input.feedbackId);

    return {
      output: {
        feedbackId: ctx.input.feedbackId,
        status: result?.status,
        response: result
      },
      message: `Feedback ${ctx.input.feedbackId} status: **${result?.status || 'unknown'}**.`
    };
  })
  .build();
