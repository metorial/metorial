import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let enqueueAutopilotFeedbackTool = SlateTool.create(spec, {
  name: 'Enqueue Autopilot Feedback',
  key: 'enqueue_autopilot_feedback',
  description: `Submit text content (e.g., call transcripts, conversation logs) to Canny's AI-powered Autopilot for automatic feature request extraction and deduplication. Each request consumes one Autopilot credit.`,
  constraints: [
    'Each call consumes one Autopilot credit.',
    'The Autopilot inbox has a 100-item limit in manual mode.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe('Text content to process (e.g., call transcript, conversation)'),
      sourceType: z
        .string()
        .optional()
        .describe('Source type identifier (e.g., "twitter", "zoom", "intercom")'),
      sourceURL: z.string().optional().describe('URL where the original content can be found'),
      userId: z.string().optional().describe('Canny user ID associated with this feedback'),
      companyId: z.string().optional().describe('Company ID associated with this feedback')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was enqueued successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.enqueueFeedback({
      content: ctx.input.content,
      sourceType: ctx.input.sourceType,
      sourceURL: ctx.input.sourceURL,
      userID: ctx.input.userId,
      companyID: ctx.input.companyId
    });

    return {
      output: { success: true },
      message: `Enqueued feedback for Autopilot processing.`
    };
  })
  .build();
