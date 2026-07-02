import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let chatSchema = z.object({
  chatId: z.string().describe('Unique identifier of the chat'),
  channelId: z.string().describe('Channel the chat belongs to'),
  contactId: z.string().optional().describe('Associated contact ID'),
  status: z.string().describe('Chat status (OPEN, CLOSED, SNOOZED)'),
  isUnread: z.boolean().optional().describe('Whether the chat has unread messages'),
  assignedUserId: z.string().nullable().optional().describe('Assigned user ID'),
  assignedTeamId: z.string().nullable().optional().describe('Assigned team ID'),
  lastMessageAt: z.string().nullable().optional().describe('When the last message was sent'),
  createdAt: z.string().optional().describe('When the chat was created'),
  updatedAt: z.string().optional().describe('When the chat was last updated')
});

export let listChatsTool = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `List all chats on a specific channel. Returns chat IDs, statuses, contact associations, assignment details, and message timestamps. Use this to find ongoing conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to list chats for')
    })
  )
  .output(
    z.object({
      chats: z.array(chatSchema).describe('List of chats')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listChats(ctx.input.channelId);

    let chats = (Array.isArray(result) ? result : (result?.chats ?? [])).map((c: any) => ({
      chatId: c.id,
      channelId: c.channelId,
      contactId: c.contactId,
      status: c.status,
      isUnread: c.isUnread,
      assignedUserId: c.assignedUserId ?? null,
      assignedTeamId: c.assignedTeamId ?? null,
      lastMessageAt: c.lastMessageAt ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: { chats },
      message: `Found **${chats.length}** chat(s).`
    };
  })
  .build();

export let updateChatTool = SlateTool.create(spec, {
  name: 'Update Chat',
  key: 'update_chat',
  description: `Update a chat's properties including status, read state, and assignment. Use this to close or reopen chats, mark them as read/unread, or assign them to team members.`
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID the chat belongs to'),
      chatId: z.string().describe('ID of the chat to update'),
      isUnread: z.boolean().optional().describe('Mark as unread or read'),
      status: z.enum(['OPEN', 'CLOSED', 'SNOOZED']).optional().describe('New chat status'),
      assignedUserId: z
        .string()
        .nullable()
        .optional()
        .describe('User ID to assign the chat to (null to unassign)'),
      assignedTeamId: z
        .string()
        .nullable()
        .optional()
        .describe('Team ID to assign the chat to (null to unassign)')
    })
  )
  .output(chatSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.isUnread !== undefined) updateData.isUnread = ctx.input.isUnread;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.assignedUserId !== undefined)
      updateData.assignedUserId = ctx.input.assignedUserId;
    if (ctx.input.assignedTeamId !== undefined)
      updateData.assignedTeamId = ctx.input.assignedTeamId;

    let chat = await client.updateChat(ctx.input.channelId, ctx.input.chatId, updateData);

    return {
      output: {
        chatId: chat.id,
        channelId: chat.channelId,
        contactId: chat.contactId,
        status: chat.status,
        isUnread: chat.isUnread,
        assignedUserId: chat.assignedUserId ?? null,
        assignedTeamId: chat.assignedTeamId ?? null,
        lastMessageAt: chat.lastMessageAt ?? null,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      message: `Updated chat **${chat.id}** — status: **${chat.status}**.`
    };
  })
  .build();
