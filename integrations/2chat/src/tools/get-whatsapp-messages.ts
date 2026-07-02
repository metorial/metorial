import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageUuid: z.string().optional().describe('UUID of the message'),
  fromNumber: z.string().optional().describe('Sender phone number'),
  toNumber: z.string().optional().describe('Recipient phone number'),
  text: z.string().optional().describe('Text content of the message'),
  mediaUrl: z.string().optional().describe('URL of attached media'),
  mediaType: z.string().optional().describe('MIME type of attached media'),
  direction: z.string().optional().describe('Message direction (inbound/outbound)'),
  status: z.string().optional().describe('Message delivery status'),
  sentAt: z.string().optional().describe('Timestamp when message was sent')
});

export let getWhatsAppMessages = SlateTool.create(spec, {
  name: 'Get WhatsApp Messages',
  key: 'get_whatsapp_messages',
  description: `Retrieve WhatsApp messages for a connected number. Can filter by conversation partner, fetch group messages, list conversations, or get a specific message by UUID.`,
  instructions: [
    'Use "remoteNumber" to filter messages from/to a specific contact.',
    'Use "groupUuid" to get messages from a specific group.',
    'Use "messageUuid" to retrieve a single specific message.',
    'Omit all optional filters to list conversations.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      remoteNumber: z
        .string()
        .optional()
        .describe('Filter messages to/from this specific number'),
      groupUuid: z.string().optional().describe('Get messages from this specific group'),
      messageUuid: z.string().optional().describe('Get a single message by its UUID'),
      page: z.number().optional().describe('Page number for pagination (defaults to 1)')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).optional().describe('List of messages'),
      conversations: z
        .array(
          z.object({
            remoteNumber: z
              .string()
              .optional()
              .describe('Phone number of the conversation partner'),
            contactName: z.string().optional().describe('Contact name if available'),
            lastMessageAt: z.string().optional().describe('Timestamp of the last message'),
            unreadCount: z.number().optional().describe('Number of unread messages')
          })
        )
        .optional()
        .describe('List of conversations'),
      totalPages: z.number().optional().describe('Total number of pages available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let { fromNumber, remoteNumber, groupUuid, messageUuid, page } = ctx.input;

    if (messageUuid) {
      let result = await client.getSingleMessage(fromNumber, messageUuid);
      let msg = result.message || result;
      return {
        output: {
          messages: [
            {
              messageUuid: msg.uuid || msg.message_uuid,
              fromNumber: msg.from_number || msg.from,
              toNumber: msg.to_number || msg.to,
              text: msg.text || msg.body,
              mediaUrl: msg.media_url || msg.url,
              mediaType: msg.media_type || msg.mime_type,
              direction: msg.direction,
              status: msg.status,
              sentAt: msg.sent_at || msg.created_at
            }
          ]
        },
        message: `Retrieved message **${messageUuid}**.`
      };
    }

    if (groupUuid) {
      let result = await client.getGroupMessages(fromNumber, groupUuid, { page });
      let messages = (result.messages || result.data || []).map((m: any) => ({
        messageUuid: m.uuid || m.message_uuid,
        fromNumber: m.from_number || m.from,
        toNumber: m.to_number || m.to,
        text: m.text || m.body,
        mediaUrl: m.media_url || m.url,
        mediaType: m.media_type || m.mime_type,
        direction: m.direction,
        status: m.status,
        sentAt: m.sent_at || m.created_at
      }));

      return {
        output: { messages, totalPages: result.total_pages || result.pages },
        message: `Retrieved **${messages.length}** group message(s).`
      };
    }

    if (remoteNumber) {
      let result = await client.getMessages(fromNumber, { page, remoteNumber });
      let messages = (result.messages || result.data || []).map((m: any) => ({
        messageUuid: m.uuid || m.message_uuid,
        fromNumber: m.from_number || m.from,
        toNumber: m.to_number || m.to,
        text: m.text || m.body,
        mediaUrl: m.media_url || m.url,
        mediaType: m.media_type || m.mime_type,
        direction: m.direction,
        status: m.status,
        sentAt: m.sent_at || m.created_at
      }));

      return {
        output: { messages, totalPages: result.total_pages || result.pages },
        message: `Retrieved **${messages.length}** message(s) with **${remoteNumber}**.`
      };
    }

    // List conversations
    let result = await client.listConversations(fromNumber, { page });
    let conversations = (result.conversations || result.data || []).map((c: any) => ({
      remoteNumber: c.remote_number || c.number || c.phone_number,
      contactName: c.contact_name || c.name,
      lastMessageAt: c.last_message_at || c.updated_at,
      unreadCount: c.unread_count || c.unread
    }));

    return {
      output: { conversations, totalPages: result.total_pages || result.pages },
      message: `Found **${conversations.length}** conversation(s).`
    };
  })
  .build();
