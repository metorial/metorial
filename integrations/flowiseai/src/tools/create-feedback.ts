import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createFeedback = SlateTool.create(spec, {
  name: 'Create Feedback',
  key: 'create_feedback',
  description: `Submit user feedback (thumbs up/down rating and optional comment) for a specific AI response message. Useful for capturing quality signals tied to chat interactions.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow the feedback relates to'),
      chatId: z.string().describe('Chat conversation ID'),
      messageId: z.string().describe('ID of the specific chat message to rate'),
      rating: z.enum(['THUMBS_UP', 'THUMBS_DOWN']).describe('Rating for the response'),
      content: z.string().optional().describe('Optional text comment with the feedback')
    })
  )
  .output(
    z.object({
      feedbackId: z.string().describe('ID of the created feedback entry'),
      chatflowId: z.string().optional().describe('Associated chatflow ID'),
      chatId: z.string().optional().describe('Associated chat conversation ID'),
      messageId: z.string().optional().describe('Associated message ID'),
      rating: z.string().optional().describe('Rating value'),
      content: z.string().optional().nullable().describe('Feedback comment'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createFeedback({
      chatflowid: ctx.input.chatflowId,
      chatId: ctx.input.chatId,
      messageId: ctx.input.messageId,
      rating: ctx.input.rating,
      content: ctx.input.content
    });

    return {
      output: {
        feedbackId: result.id,
        chatflowId: result.chatflowid,
        chatId: result.chatId,
        messageId: result.messageId,
        rating: result.rating,
        content: result.content,
        createdDate: result.createdDate
      },
      message: `Created **${ctx.input.rating}** feedback for message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
