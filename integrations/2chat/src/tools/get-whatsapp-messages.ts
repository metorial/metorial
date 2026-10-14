import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  sessionKey: z
    .string()
    .optional()
    .describe('Conversation session key for fetching or deleting a message'),
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
    'Use "messageUuid" to retrieve a single specific message. Supply its sessionKey from an earlier result for older messages.',
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
      sessionKey: z
        .string()
        .optional()
        .describe('Session key for a single message; returned in messages and conversations'),
      page: z
        .number()
        .optional()
        .describe('Zero-based page number for pagination (defaults to 0)')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).optional().describe('List of messages'),
      conversations: z
        .array(
          z.object({
            sessionKey: z.string().optional().describe('Conversation session key'),
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
    let { fromNumber, remoteNumber, groupUuid, messageUuid, sessionKey, page } = ctx.input;
    if (page !== undefined && (!Number.isInteger(page) || page < 0))
      throw createApiServiceError('page must be a nonnegative whole number.', {
        reason: 'invalid_page'
      });
    if (sessionKey && !messageUuid)
      throw createApiServiceError('sessionKey is only used with messageUuid.', {
        reason: 'invalid_message_filters'
      });
    if (remoteNumber && groupUuid)
      throw createApiServiceError('Provide either remoteNumber or groupUuid, not both.', {
        reason: 'invalid_message_filters'
      });

    let mapMessage = (msg: any) => {
      let payload = msg.message ?? {};
      let inbound =
        msg.is_from_chatter ??
        (msg.sent_by === 'user'
          ? true
          : ['api', 'agent'].includes(msg.sent_by)
            ? false
            : undefined);
      let channel = msg.channel_phone_number ?? fromNumber;
      let remote = msg.remote_phone_number ?? remoteNumber;
      let timestamp =
        typeof msg.timestamp === 'number' ? new Date(msg.timestamp * 1000) : undefined;
      return {
        messageUuid: msg.uuid ?? msg.message_uuid ?? undefined,
        sessionKey: msg.session_key ?? undefined,
        fromNumber:
          msg.from_number ??
          msg.from ??
          msg.participant?.phone_number ??
          (inbound === true ? remote : inbound === false ? channel : undefined),
        toNumber:
          msg.to_number ??
          msg.to ??
          (inbound === true ? channel : inbound === false ? remote : undefined),
        text: payload.text ?? msg.text ?? msg.body ?? undefined,
        mediaUrl: payload.media?.url ?? msg.media_url ?? msg.url ?? undefined,
        mediaType: payload.media?.mime_type ?? msg.media_type ?? msg.mime_type ?? undefined,
        direction:
          msg.direction ??
          (inbound === true ? 'inbound' : inbound === false ? 'outbound' : undefined),
        status:
          msg.status ??
          (msg.read === true
            ? 'read'
            : msg.received === true
              ? 'delivered'
              : msg.sent === true
                ? 'sent'
                : undefined),
        sentAt:
          msg.sent_at ??
          msg.created_at ??
          (timestamp && Number.isFinite(timestamp.getTime())
            ? timestamp.toISOString()
            : undefined)
      };
    };

    if (messageUuid) {
      let result = await client.getSingleMessage(fromNumber, messageUuid, sessionKey);
      return {
        output: { messages: [mapMessage(result.message ?? result)] },
        message: `Retrieved message **${messageUuid}**.`
      };
    }

    if (groupUuid || remoteNumber) {
      let result = groupUuid
        ? await client.getGroupMessages(fromNumber, groupUuid, { page })
        : await client.getMessages(fromNumber, { page, remoteNumber });
      let messages = (result.messages ?? []).map(mapMessage);
      return {
        output: { messages, totalPages: result.total_pages ?? result.pages ?? undefined },
        message: `Retrieved **${messages.length}** message(s).`
      };
    }

    let result = await client.listConversations(fromNumber, { page });
    let conversations = (result.sessions ?? result.conversations ?? []).map(
      (conversation: any) => ({
        sessionKey: conversation.session_key ?? undefined,
        remoteNumber: conversation.phone_number ?? conversation.remote_number ?? undefined,
        contactName: conversation.friendly_name ?? conversation.contact_name ?? undefined,
        lastMessageAt:
          conversation.last_activity_at ?? conversation.last_message_at ?? undefined,
        unreadCount: conversation.unread_count ?? conversation.unread ?? undefined
      })
    );
    return {
      output: { conversations, totalPages: result.total_pages ?? result.pages ?? undefined },
      message: `Found **${conversations.length}** conversation(s).`
    };
  })
  .build();
