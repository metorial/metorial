import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let chatEvents = SlateTrigger.create(spec, {
  name: 'Chat Events',
  key: 'chat_events',
  description:
    'Triggers when a chat has unread messages or when a note is added to a conversation in Spoki.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of chat event'),
      eventId: z.string().describe('Unique event identifier'),
      chatId: z.string().optional().describe('ID of the chat'),
      contactId: z.string().optional().describe('ID of the related contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      hasUnreadMessages: z
        .boolean()
        .optional()
        .describe('Whether the chat currently has unread messages'),
      unreadCount: z.number().optional().describe('Number of unread messages'),
      noteText: z.string().optional().describe('Text of the added note (for note events)'),
      noteAuthor: z.string().optional().describe('Author of the note'),
      timestamp: z.string().optional().describe('When the event occurred'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      chatId: z.string().optional().describe('Chat ID'),
      contactId: z.string().optional().describe('Contact ID'),
      phone: z.string().optional().describe('Phone number'),
      hasUnreadMessages: z
        .boolean()
        .optional()
        .describe('Whether the chat has unread messages'),
      unreadCount: z.number().optional().describe('Number of unread messages'),
      noteText: z.string().optional().describe('Note text'),
      noteAuthor: z.string().optional().describe('Note author'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = data?.event || data?.type || data?.event_type || 'unknown';
      let chat = data?.chat || data?.data || data;

      let eventTypeMap: Record<string, string> = {
        chat_unread_messages: 'chat.unread_messages',
        chat_unread: 'chat.unread_messages',
        note_added: 'chat.note_added'
      };

      let normalizedType = eventTypeMap[eventType] || `chat.${eventType}`;
      let chatId = chat?.id
        ? String(chat.id)
        : data?.chat_id
          ? String(data.chat_id)
          : undefined;
      let eventId = data?.id
        ? String(data.id)
        : `${normalizedType}-${chatId || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId,
            chatId,
            contactId: chat?.contact_id
              ? String(chat.contact_id)
              : data?.contact_id
                ? String(data.contact_id)
                : undefined,
            phone: chat?.phone || data?.phone,
            hasUnreadMessages:
              data?.has_unread_messages ??
              chat?.has_unread_messages ??
              (data?.unread_count ? data.unread_count > 0 : undefined),
            unreadCount: data?.unread_count ?? chat?.unread_count,
            noteText: data?.note?.text || data?.note_text || data?.note?.body,
            noteAuthor: data?.note?.author || data?.note_author || data?.note?.user?.name,
            timestamp: data?.timestamp || data?.created_at || chat?.timestamp,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          chatId: ctx.input.chatId,
          contactId: ctx.input.contactId,
          phone: ctx.input.phone,
          hasUnreadMessages: ctx.input.hasUnreadMessages,
          unreadCount: ctx.input.unreadCount,
          noteText: ctx.input.noteText,
          noteAuthor: ctx.input.noteAuthor,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
