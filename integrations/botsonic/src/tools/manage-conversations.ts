import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve a paginated list of all conversations for a bot. Supports filtering by date range, searching, sorting by recency or sentiment, and pagination. Useful for reviewing interactions and analytics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe('Search for conversations matching this query'),
      sortBy: z
        .enum(['recent', 'negative', 'positive'])
        .optional()
        .describe('Sort conversations by recency or sentiment'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter conversations updated after this ISO 8601 datetime'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter conversations updated before this ISO 8601 datetime'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Number of results per page (1-100, default 50)')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            chatId: z.string().describe('Unique conversation identifier'),
            botId: z.string().describe('Bot the conversation belongs to'),
            ownerId: z.string().describe('Owner identifier'),
            messageCount: z.number().describe('Number of messages in the conversation'),
            createdAt: z.string().describe('When the conversation started'),
            updatedAt: z.string().describe('When the conversation was last active')
          })
        )
        .describe('List of conversations'),
      total: z.number().describe('Total number of conversations'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.listConversations({
      searchQuery: ctx.input.searchQuery,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let conversations = result.items.map(c => ({
      chatId: c.chat_id,
      botId: c.bot_id,
      ownerId: c.owner_id,
      messageCount: c.num_messages || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        conversations,
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Found **${result.total}** conversations (page ${result.page}/${result.pages}).`
    };
  })
  .build();

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve the full details of a specific conversation including all messages and metadata. Useful for reviewing a particular chat interaction.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The unique chat ID of the conversation to retrieve')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Unique conversation identifier'),
      botId: z.string().describe('Bot the conversation belongs to'),
      ownerId: z.string().describe('Owner identifier'),
      messageCount: z.number().describe('Number of messages'),
      chatMessages: z.array(z.any()).describe('Full chat message history'),
      source: z.string().optional().describe('Source of the conversation'),
      isResolved: z
        .boolean()
        .optional()
        .describe('Whether the conversation is marked resolved'),
      chatEnded: z.boolean().optional().describe('Whether the chat has ended'),
      additionalFeedback: z.string().optional().describe('Additional feedback from the user'),
      createdAt: z.string().describe('When the conversation started'),
      updatedAt: z.string().describe('When the conversation was last active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.getConversation(ctx.input.chatId);

    return {
      output: {
        chatId: result.chat_id,
        botId: result.bot_id,
        ownerId: result.owner_id,
        messageCount: result.num_messages || 0,
        chatMessages: result.chat_data || [],
        source: result.source,
        isResolved: result.is_resolved,
        chatEnded: result.chat_ended,
        additionalFeedback: result.additional_feedback,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Retrieved conversation **${result.chat_id}** with ${result.num_messages || 0} messages.`
    };
  })
  .build();

export let endChat = SlateTool.create(spec, {
  name: 'End Chat',
  key: 'end_chat',
  description: `End an active chat session. Optionally provide feedback status (liked/disliked) and a text feedback message.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat ID of the conversation to end'),
      feedbackStatus: z
        .enum(['liked', 'disliked', 'none'])
        .optional()
        .describe('Feedback status for the conversation'),
      feedback: z.string().optional().describe('Optional text feedback about the conversation')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the chat was successfully ended'),
      chatId: z.string().describe('The chat ID that was ended')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    await client.endChat(ctx.input.chatId, {
      status: ctx.input.feedbackStatus,
      feedback: ctx.input.feedback
    });

    return {
      output: {
        success: true,
        chatId: ctx.input.chatId
      },
      message: `Ended chat session **${ctx.input.chatId}**.${ctx.input.feedbackStatus ? ` Feedback: ${ctx.input.feedbackStatus}.` : ''}`
    };
  })
  .build();
