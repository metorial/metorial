import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let conversationFeedbackTool = SlateTool.create(spec, {
  name: 'Conversation Feedback',
  key: 'conversation_feedback',
  description: `Submit upvote or downvote feedback on conversations or individual messages. Helps improve bot performance and gathers user sentiment data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Conversation ID to rate'),
      messageId: z
        .string()
        .optional()
        .describe('Specific message ID to rate (omit to rate the entire conversation)'),
      vote: z.enum(['upvote', 'downvote']).describe('Feedback type')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      messageId: z
        .string()
        .optional()
        .describe('Message ID (if a specific message was rated)'),
      vote: z.string().describe('Vote submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { conversationId, messageId, vote } = ctx.input;

    if (messageId) {
      if (vote === 'upvote') {
        await client.upvoteMessage(conversationId, messageId);
      } else {
        await client.downvoteMessage(conversationId, messageId);
      }
      return {
        output: { conversationId, messageId, vote },
        message: `Message **${messageId}** ${vote}d in conversation **${conversationId}**.`
      };
    }

    if (vote === 'upvote') {
      await client.upvoteConversation(conversationId);
    } else {
      await client.downvoteConversation(conversationId);
    }

    return {
      output: { conversationId, vote },
      message: `Conversation **${conversationId}** ${vote}d.`
    };
  })
  .build();
