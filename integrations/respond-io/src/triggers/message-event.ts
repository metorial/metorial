import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvent = SlateTrigger.create(spec, {
  name: 'Message Event',
  key: 'message_event',
  description:
    'Triggers when a new incoming or outgoing message is sent or received on any connected channel.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of message event'),
      messageId: z.string().describe('Unique message ID'),
      contactId: z.string().describe('ID of the contact'),
      direction: z.string().optional().describe('Message direction (incoming or outgoing)'),
      messageType: z.string().optional().describe('Message type (text, attachment, etc.)'),
      text: z.string().optional().describe('Text content of the message'),
      channelId: z.string().optional().describe('Channel the message was sent through'),
      channelType: z.string().optional().describe('Type of channel'),
      contactName: z.string().optional().describe('Name of the contact'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      contactPhone: z.string().optional().describe('Phone number of the contact'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      contactId: z.string().describe('ID of the contact'),
      direction: z.string().optional().describe('Message direction (incoming or outgoing)'),
      messageType: z.string().optional().describe('Message type'),
      text: z.string().optional().describe('Text content of the message'),
      channelId: z.string().optional().describe('Channel the message was sent through'),
      channelType: z.string().optional().describe('Type of channel'),
      contactName: z.string().optional().describe('Name of the contact'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      contactPhone: z.string().optional().describe('Phone number of the contact'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let event = data?.event || data?.type || 'message.created';
      let payload = data?.data || data;

      let message = payload?.message || payload;
      let contact = payload?.contact || {};
      let channel = payload?.channel || {};

      return {
        inputs: [
          {
            eventType: event,
            messageId: String(message?.id || message?.messageId || payload?.id || ''),
            contactId: String(contact?.id || payload?.contactId || ''),
            direction: message?.direction || payload?.direction,
            messageType: message?.type || payload?.messageType,
            text: message?.text || message?.body || payload?.text,
            channelId: String(channel?.id || message?.channelId || ''),
            channelType: channel?.type || channel?.platform,
            contactName: contact?.firstName
              ? `${contact.firstName} ${contact.lastName || ''}`.trim()
              : undefined,
            contactEmail: contact?.email,
            contactPhone: contact?.phone,
            timestamp: message?.createdAt || payload?.createdAt || payload?.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let direction = ctx.input.direction || 'unknown';
      let eventType = direction === 'outgoing' ? 'message.outgoing' : 'message.incoming';

      return {
        type: eventType,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          contactId: ctx.input.contactId,
          direction: ctx.input.direction,
          messageType: ctx.input.messageType,
          text: ctx.input.text,
          channelId: ctx.input.channelId,
          channelType: ctx.input.channelType,
          contactName: ctx.input.contactName,
          contactEmail: ctx.input.contactEmail,
          contactPhone: ctx.input.contactPhone,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
