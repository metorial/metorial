import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let getChatTool = SlateTool.create(spec, {
  name: 'Get Chat',
  key: 'get_chat',
  description: `Retrieve detailed information about a chat including its type, title, description, member count, and permissions. Works for private chats, groups, supergroups, and channels.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username to retrieve info for')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Unique chat identifier'),
      type: z.string().describe('Chat type: private, group, supergroup, or channel'),
      title: z.string().optional().describe('Title for groups, supergroups, and channels'),
      username: z.string().optional().describe('Chat username if available'),
      firstName: z.string().optional().describe('First name (private chats only)'),
      lastName: z.string().optional().describe('Last name (private chats only)'),
      description: z.string().optional().describe('Chat description or bio'),
      memberCount: z.number().optional().describe('Number of members in the chat'),
      inviteLink: z.string().optional().describe('Primary invite link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let chat = await client.getChat(ctx.input.chatId);
    let memberCount: number | undefined;

    try {
      if (chat.type !== 'private') {
        memberCount = await client.getChatMemberCount(ctx.input.chatId);
      }
    } catch {
      // Member count may fail if bot lacks permissions
    }

    return {
      output: {
        chatId: String(chat.id),
        type: chat.type,
        title: chat.title,
        username: chat.username,
        firstName: chat.first_name,
        lastName: chat.last_name,
        description: chat.bio || chat.description,
        memberCount,
        inviteLink: chat.invite_link
      },
      message: `Retrieved info for **${chat.title || chat.first_name || chat.id}** (${chat.type})${memberCount ? ` — ${memberCount} members` : ''}.`
    };
  })
  .build();
