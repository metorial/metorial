import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let enqueueAutopilotFeedbackTool = SlateTool.create(spec, {
  name: 'Enqueue Autopilot Feedback',
  key: 'enqueue_autopilot_feedback',
  description: `Submit text content (e.g., call transcripts, conversation logs) to Canny's AI-powered Autopilot for automatic feature request extraction and deduplication. Each request consumes one Autopilot credit.`,
  constraints: [
    'Each call consumes one Autopilot credit.',
    'The Autopilot inbox has a 100-item limit in manual mode.',
    'Provide conversationId and either authorUserId or userId. The author must have an application user ID.',
    'Company associations are managed on the author, rather than on the feedback payload.'
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
      companyId: z
        .string()
        .optional()
        .describe(
          'Unsupported by this endpoint; omit and associate the author with a company instead'
        ),
      conversationId: z
        .string()
        .optional()
        .describe('Unique ID of the source conversation or call (required)'),
      authorUserId: z
        .string()
        .optional()
        .describe("Author's user ID in your application; provide this or the Canny userId"),
      type: z
        .enum(['call', 'conversation'])
        .optional()
        .describe('Type of feedback source; defaults to conversation')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was enqueued successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.conversationId) {
      throw createApiServiceError(
        'Provide conversationId to identify the source conversation or call.'
      );
    }
    if ([ctx.input.authorUserId, ctx.input.userId].filter(Boolean).length !== 1) {
      throw createApiServiceError(
        'Provide exactly one of authorUserId or userId to identify the author.'
      );
    }
    if (ctx.input.companyId !== undefined) {
      throw createApiServiceError(
        'Canny does not accept companyId when enqueueing feedback. Associate the author with the company using create_or_update_user, then omit companyId.'
      );
    }
    let client = new CannyClient(ctx.auth.token);
    let authorUserId = ctx.input.authorUserId;
    if (!authorUserId && ctx.input.userId) {
      let author = await client.retrieveUser({ id: ctx.input.userId });
      authorUserId = author.userID;
    }
    if (!authorUserId) {
      throw createApiServiceError(
        'The author must have an application user ID. Set userId with create_or_update_user before enqueueing feedback.'
      );
    }
    let result = await client.enqueueFeedback({
      type: ctx.input.type ?? 'conversation',
      payload: {
        id: ctx.input.conversationId,
        authorID: authorUserId,
        text: ctx.input.content,
        sourceType: ctx.input.sourceType,
        sourceURL: ctx.input.sourceURL
      }
    });
    if (result !== 'success') {
      throw createApiServiceError('Canny did not confirm that the feedback was enqueued.');
    }

    return {
      output: { success: true },
      message: `Enqueued feedback for Autopilot processing.`
    };
  })
  .build();
