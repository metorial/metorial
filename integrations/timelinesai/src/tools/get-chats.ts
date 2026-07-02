import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let chatSchema = z.object({
  chatId: z.number().describe('Unique chat identifier'),
  name: z.string().optional().describe('Chat display name'),
  phone: z.string().optional().describe('Contact phone number'),
  isGroup: z.boolean().optional().describe('Whether the chat is a group chat'),
  responsible: z.string().optional().describe('Email of the assigned team member'),
  lastMessageText: z.string().optional().describe('Text of the last message'),
  lastMessageTimestamp: z.string().optional().describe('Timestamp of the last message'),
  isRead: z.boolean().optional().describe('Whether the chat is read'),
  isClosed: z.boolean().optional().describe('Whether the chat is closed'),
  labels: z.array(z.string()).optional().describe('Labels assigned to the chat'),
  whatsappAccountId: z.string().optional().describe('WhatsApp account ID for this chat')
});

export let getChats = SlateTool.create(spec, {
  name: 'Get Chats',
  key: 'get_chats',
  description: `Retrieve WhatsApp chat conversations with extensive filtering. Supports filtering by label, WhatsApp account, group/direct, assigned user, name, phone, read/unread status, and date range. Results are paginated (50 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      label: z.string().optional().describe('Filter by labels (comma-separated)'),
      whatsappAccountId: z
        .string()
        .optional()
        .describe('Filter by WhatsApp account ID (comma-separated)'),
      group: z
        .boolean()
        .optional()
        .describe('Filter group chats (true) or direct chats (false)'),
      responsible: z
        .string()
        .optional()
        .describe('Filter by assigned user email (comma-separated)'),
      name: z
        .string()
        .optional()
        .describe('Filter by chat name (case-insensitive, comma-separated)'),
      phone: z.string().optional().describe('Filter by phone number'),
      read: z.boolean().optional().describe('Filter by read (true) or unread (false) status'),
      closed: z
        .boolean()
        .optional()
        .describe('Filter by closed (true) or open (false) status'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter chats created after this ISO datetime'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter chats created before this ISO datetime')
    })
  )
  .output(
    z.object({
      chats: z.array(chatSchema).describe('List of chat conversations'),
      hasMorePages: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getChats(ctx.input);

    let chats = (result?.data?.chats || []).map((c: any) => ({
      chatId: c.id || c.chat_id,
      name: c.name,
      phone: c.phone,
      isGroup: c.is_group,
      responsible: c.responsible,
      lastMessageText: c.last_message_text || c.last_message?.text,
      lastMessageTimestamp: c.last_message_timestamp || c.last_message?.timestamp,
      isRead: c.read,
      isClosed: c.closed,
      labels: c.labels,
      whatsappAccountId: c.whatsapp_account_id
    }));

    let hasMorePages = result?.data?.has_more_pages || false;

    return {
      output: { chats, hasMorePages },
      message: `Found **${chats.length}** chat(s)${hasMorePages ? ' (more pages available)' : ''}.`
    };
  })
  .build();
