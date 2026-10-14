import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let chatSchema = z.object({
  id: z.string().describe('Chat ID'),
  channelId: z.string(),
  contactId: z.string(),
  handleId: z.string(),
  status: z.enum(['open', 'closed', 'snoozed']).describe('Current chat status'),
  isUnread: z.boolean(),
  unreadCount: z.number(),
  openUntil: z.string().nullable(),
  assignedUserId: z.string().nullable(),
  assignedTeamId: z.string().nullable(),
  isSensitive: z.boolean(),
  latestMessage: z
    .object({
      id: z.string(),
      vendorId: z.string().nullable(),
      sender: z.enum(['outbound', 'inbound', 'unknown', 'system']),
      type: z.enum(['text', 'media', 'audio', 'location', 'contact', 'auth']),
      timestamp: z.string(),
      text: z.string().nullable()
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let getChatTool = SlateTool.create(spec, {
  name: 'Get Chat',
  key: 'get_chat',
  description:
    'Retrieve one chat using Heyy API v3, including unread state, assignments, sensitivity, contact and channel IDs, and the latest message. Use List Chats or Get Contact to discover chat IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID. Use List Chats or Get Contact to find it.')
    })
  )
  .output(chatSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, version: 'v3' });
    let result = chatSchema.safeParse(await client.getChatById(ctx.input.chatId));
    if (!result.success) {
      throw createApiServiceError('Heyy returned an invalid chat response.', {
        reason: 'heyy_invalid_response'
      });
    }
    return {
      output: result.data,
      message: `Retrieved chat **${result.data.id}** — status: **${result.data.status}**.`
    };
  })
  .build();
