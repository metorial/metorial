import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendPageMessage = SlateTool.create(spec, {
  name: 'Send Page Message',
  key: 'send_page_message',
  description: `Send a message from a Facebook Page to a user via Messenger. Can also list conversations and retrieve message history for a Page.
Requires the \`pages_messaging\` permission.`,
  instructions: [
    'Use `send` to send a message to a specific recipient via Messenger.',
    'Use `list_conversations` to list recent conversations for a Page.',
    'Use `get_messages` to retrieve messages from a specific conversation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['send', 'list_conversations', 'get_messages'])
        .describe('Action to perform'),
      pageId: z.string().describe('Facebook Page ID'),
      recipientId: z
        .string()
        .optional()
        .describe('Recipient user ID (required for send action)'),
      messageText: z.string().optional().describe('Message text to send (for send action)'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID (for get_messages action)'),
      limit: z.number().optional().describe('Max results to return'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      recipientId: z.string().optional().describe('Recipient ID'),
      conversations: z
        .array(
          z.object({
            conversationId: z.string().describe('Conversation ID'),
            snippet: z.string().optional().describe('Last message snippet'),
            updatedTime: z.string().optional().describe('Last update timestamp'),
            messageCount: z.number().optional().describe('Total messages in conversation')
          })
        )
        .optional()
        .describe('Page conversations'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            messageText: z.string().optional().describe('Message text'),
            senderId: z.string().optional().describe('Sender ID'),
            senderName: z.string().optional().describe('Sender name'),
            createdTime: z.string().optional().describe('Message timestamp')
          })
        )
        .optional()
        .describe('Messages in a conversation'),
      nextCursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let pageAccessToken = await client.getPageAccessToken(ctx.input.pageId);

    if (ctx.input.action === 'send') {
      if (!ctx.input.recipientId || !ctx.input.messageText) {
        throw facebookServiceError('recipientId and messageText are required for send action');
      }
      let result = await client.sendPageMessage(
        ctx.input.pageId,
        ctx.input.recipientId,
        { text: ctx.input.messageText },
        pageAccessToken
      );
      return {
        output: {
          messageId: result.message_id,
          recipientId: result.recipient_id
        },
        message: `Sent message to recipient **${result.recipient_id}**.`
      };
    }

    if (ctx.input.action === 'list_conversations') {
      let result = await client.getConversations(ctx.input.pageId, {
        limit: ctx.input.limit,
        after: ctx.input.after,
        pageAccessToken
      });
      return {
        output: {
          conversations: result.data.map((c: any) => ({
            conversationId: c.id,
            snippet: c.snippet,
            updatedTime: c.updated_time,
            messageCount: c.message_count
          })),
          nextCursor: result.paging?.cursors?.after
        },
        message: `Retrieved **${result.data.length}** conversation(s).`
      };
    }

    // get_messages
    if (!ctx.input.conversationId) {
      throw facebookServiceError('conversationId is required for get_messages action');
    }
    let result = await client.getConversationMessages(ctx.input.conversationId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      pageAccessToken
    });
    return {
      output: {
        messages: result.data.map((m: any) => ({
          messageId: m.id,
          messageText: m.message,
          senderId: m.from?.id,
          senderName: m.from?.name,
          createdTime: m.created_time
        })),
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${result.data.length}** message(s).`
    };
  })
  .build();
