import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let listFeedback = SlateTool.create(spec, {
  name: 'List Feedback',
  key: 'list_feedback',
  description: `Retrieve all feedback entries for a specific chatflow. Supports filtering by chat ID, date range, and sort order.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to get feedback for'),
      chatId: z.string().optional().describe('Filter by specific chat conversation ID'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order for results'),
      startDate: z.string().optional().describe('Filter feedback after this date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter feedback before this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      feedbackEntries: z
        .array(
          z.object({
            feedbackId: z.string().describe('Unique feedback ID'),
            chatflowId: z.string().optional().describe('Associated chatflow ID'),
            chatId: z.string().optional().describe('Chat conversation ID'),
            messageId: z.string().optional().describe('Associated message ID'),
            rating: z.string().optional().describe('THUMBS_UP or THUMBS_DOWN'),
            content: z.string().optional().nullable().describe('Feedback comment'),
            createdDate: z.string().optional().describe('ISO 8601 creation date')
          })
        )
        .describe('List of feedback entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { chatflowId, ...params } = ctx.input;
    let result = await client.listFeedback(chatflowId, params);
    let entries = Array.isArray(result) ? result : [];

    return {
      output: {
        feedbackEntries: entries.map((f: any) => ({
          feedbackId: f.id,
          chatflowId: f.chatflowid,
          chatId: f.chatId,
          messageId: f.messageId,
          rating: f.rating,
          content: f.content,
          createdDate: f.createdDate
        }))
      },
      message: `Retrieved **${entries.length}** feedback entry(ies) for chatflow \`${chatflowId}\`.`
    };
  })
  .build();
