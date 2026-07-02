import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let listChats = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `Retrieve live chat conversations from GoSquared Assistant. Returns active chat conversations with optional date range filtering and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .string()
        .optional()
        .describe('Pagination in format "offset,count" (e.g. "0,10")'),
      from: z.string().optional().describe('Start date for filtering chats'),
      to: z.string().optional().describe('End date for filtering chats')
    })
  )
  .output(
    z.object({
      chats: z.array(z.record(z.string(), z.any())).describe('List of chat conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.getChats({
      limit: ctx.input.limit,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let chats = result?.list || result?.chats || [];

    return {
      output: { chats },
      message: `Retrieved **${chats.length}** chat conversations.`
    };
  })
  .build();

export let getChatMessages = SlateTool.create(spec, {
  name: 'Get Chat Messages',
  key: 'get_chat_messages',
  description: `Retrieve messages from a specific chat conversation in GoSquared Assistant. Returns the full message history for a given chat.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat/conversation ID (matches the person_id)'),
      limit: z.string().optional().describe('Maximum number of messages to return')
    })
  )
  .output(
    z.object({
      messages: z
        .array(z.record(z.string(), z.any()))
        .describe('List of messages in the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.getChatMessages(ctx.input.chatId, {
      limit: ctx.input.limit
    });

    let messages = result?.list || result?.messages || [];

    return {
      output: { messages },
      message: `Retrieved **${messages.length}** messages from chat **${ctx.input.chatId}**.`
    };
  })
  .build();

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a message in a GoSquared Assistant chat conversation. Messages are sent as the agent (owner of the API key). Can be used for automated messaging in response to events.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat/conversation ID to send the message to'),
      content: z.string().describe('Message content to send')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.sendChatMessage(ctx.input.chatId, {
      content: ctx.input.content
    });

    return {
      output: { success: true },
      message: `Sent message to chat **${ctx.input.chatId}**.`
    };
  })
  .build();

export let addChatNote = SlateTool.create(spec, {
  name: 'Add Chat Note',
  key: 'add_chat_note',
  description: `Leave an internal note on a GoSquared Assistant chat conversation. Notes are visible only to agents, not to the visitor.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat/conversation ID to add a note to'),
      content: z.string().describe('Note content')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the note was added successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.addChatNote(ctx.input.chatId, ctx.input.content);

    return {
      output: { success: true },
      message: `Added note to chat **${ctx.input.chatId}**.`
    };
  })
  .build();

export let archiveChatConversation = SlateTool.create(spec, {
  name: 'Archive Chat',
  key: 'archive_chat',
  description: `Archive or unarchive a chat conversation in GoSquared Assistant.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('The chat/conversation ID'),
      archive: z.boolean().describe('True to archive, false to unarchive')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    if (ctx.input.archive) {
      await client.archiveChat(ctx.input.chatId);
    } else {
      await client.unarchiveChat(ctx.input.chatId);
    }

    return {
      output: { success: true },
      message: `${ctx.input.archive ? 'Archived' : 'Unarchived'} chat **${ctx.input.chatId}**.`
    };
  })
  .build();
