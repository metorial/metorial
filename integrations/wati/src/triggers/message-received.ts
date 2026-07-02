import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageReceived = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggered when a WhatsApp message is received, including messages from new contacts.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type.'),
      messageId: z.string().describe('Unique message identifier.'),
      whatsappMessageId: z.string().optional().describe('WhatsApp message ID (WAMID).'),
      conversationId: z.string().optional().describe('Conversation identifier.'),
      ticketId: z.string().optional().describe('Ticket identifier.'),
      text: z.string().optional().describe('Message text content.'),
      messageType: z
        .string()
        .optional()
        .describe('Message content type (text, image, document, etc.).'),
      timestamp: z.string().optional().describe('Unix timestamp of the message.'),
      waId: z.string().optional().describe('Sender WhatsApp ID.'),
      senderName: z.string().optional().describe('Sender display name.'),
      operatorName: z.string().optional().describe('Assigned operator name.'),
      operatorEmail: z.string().optional().describe('Assigned operator email.'),
      channelPhoneNumber: z.string().optional().describe('Receiving channel phone number.'),
      isNewContact: z
        .boolean()
        .optional()
        .describe('Whether this is a message from a new contact.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message identifier.'),
      whatsappMessageId: z.string().optional().describe('WhatsApp message ID (WAMID).'),
      conversationId: z.string().optional().describe('Conversation identifier.'),
      ticketId: z.string().optional().describe('Ticket identifier.'),
      text: z.string().optional().describe('Message text content.'),
      messageType: z
        .string()
        .optional()
        .describe('Message content type (text, image, document, etc.).'),
      timestamp: z.string().optional().describe('Unix timestamp of the message.'),
      senderWaId: z.string().optional().describe('Sender WhatsApp ID.'),
      senderName: z.string().optional().describe('Sender display name.'),
      operatorName: z.string().optional().describe('Assigned operator name.'),
      operatorEmail: z.string().optional().describe('Assigned operator email.'),
      channelPhoneNumber: z.string().optional().describe('Receiving channel phone number.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.eventType || '';
      let isMessage = eventType === 'message' || eventType === 'newContactMessageReceived';

      if (!isMessage) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            messageId: data.id || data.whatsappMessageId || '',
            whatsappMessageId: data.whatsappMessageId,
            conversationId: data.conversationId,
            ticketId: data.ticketId,
            text: data.text,
            messageType: data.type,
            timestamp: data.timestamp?.toString(),
            waId: data.waId,
            senderName: data.senderName,
            operatorName: data.operatorName,
            operatorEmail: data.operatorEmail,
            channelPhoneNumber: data.channelPhoneNumber,
            isNewContact: eventType === 'newContactMessageReceived'
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type = ctx.input.isNewContact ? 'message.new_contact' : 'message.received';

      return {
        type,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          whatsappMessageId: ctx.input.whatsappMessageId,
          conversationId: ctx.input.conversationId,
          ticketId: ctx.input.ticketId,
          text: ctx.input.text,
          messageType: ctx.input.messageType,
          timestamp: ctx.input.timestamp,
          senderWaId: ctx.input.waId,
          senderName: ctx.input.senderName,
          operatorName: ctx.input.operatorName,
          operatorEmail: ctx.input.operatorEmail,
          channelPhoneNumber: ctx.input.channelPhoneNumber
        }
      };
    }
  })
  .build();
