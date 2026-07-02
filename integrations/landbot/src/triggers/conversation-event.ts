import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let senderSchema = z
  .object({
    senderId: z.string().optional().describe('ID of the sender'),
    senderName: z.string().optional().describe('Name of the sender'),
    senderType: z.enum(['customer', 'bot', 'agent']).optional().describe('Type of the sender')
  })
  .describe('Information about who sent the message');

let customerSchema = z
  .object({
    customerId: z.string().optional().describe('ID of the customer'),
    customerName: z.string().optional().describe('Name of the customer')
  })
  .describe('Information about the customer in the conversation');

let channelSchema = z
  .object({
    channelId: z.string().optional().describe('ID of the channel'),
    channelName: z.string().optional().describe('Name of the channel')
  })
  .describe('Information about the channel');

export let conversationEventTrigger = SlateTrigger.create(spec, {
  name: 'Conversation Event',
  key: 'conversation_event',
  description:
    'Triggered when messages are exchanged or bot events occur in a Landbot conversation. Covers message types (text, button, dialog, image, iframe) and bot events (assign, unassign). Configure a MessageHook in your Landbot bot settings pointing to the provided webhook URL.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique identifier for this message/event'),
      messageType: z
        .string()
        .describe('Type of message or event (text, button, dialog, image, iframe, event)'),
      eventAction: z
        .string()
        .optional()
        .describe('For event type: the action (assign, unassign)'),
      content: z.any().describe('Message content or event data'),
      timestamp: z.string().optional().describe('Timestamp of the message'),
      sender: senderSchema.optional(),
      customer: customerSchema.optional(),
      channel: channelSchema.optional(),
      raw: z.any().optional().describe('Raw message data from the webhook')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier for this message/event'),
      messageType: z.string().describe('Type of message or event'),
      eventAction: z
        .string()
        .optional()
        .describe('For event type: the action (assign, unassign)'),
      content: z.any().describe('Message content or event payload'),
      timestamp: z.string().optional().describe('Timestamp of the message'),
      sender: senderSchema.optional(),
      customer: customerSchema.optional(),
      channel: channelSchema.optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let messages: any[] = body?.messages ?? body?.body?.messages ?? [];

      if (!Array.isArray(messages) || messages.length === 0) {
        // If the payload itself is a single message object
        if (body?.type) {
          messages = [body];
        } else {
          return { inputs: [] };
        }
      }

      let inputs = messages.map((msg: any, index: number) => {
        let senderData = msg.sender ?? {};
        let customerData = msg.customer ?? {};
        let channelData = msg.channel ?? {};
        let messageType = msg.type ?? 'unknown';
        let eventAction: string | undefined;

        if (messageType === 'event' && msg.data?.action) {
          eventAction = msg.data.action;
        }

        let messageId = msg._raw?.id ?? msg.id ?? `${msg.timestamp ?? Date.now()}-${index}`;

        return {
          messageId: String(messageId),
          messageType,
          eventAction,
          content: msg.data ?? msg.message ?? msg.payload ?? null,
          timestamp: msg.timestamp ? String(msg.timestamp) : undefined,
          sender: {
            senderId: senderData.id ? String(senderData.id) : undefined,
            senderName: senderData.name ?? undefined,
            senderType: senderData.type ?? undefined
          },
          customer: {
            customerId: customerData.id ? String(customerData.id) : undefined,
            customerName: customerData.name ?? undefined
          },
          channel: {
            channelId: channelData.id ? String(channelData.id) : undefined,
            channelName: channelData.name ?? undefined
          },
          raw: msg._raw ?? msg
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType: string;

      if (ctx.input.messageType === 'event' && ctx.input.eventAction) {
        eventType = `conversation.${ctx.input.eventAction}`;
      } else {
        eventType = `message.${ctx.input.messageType}`;
      }

      return {
        type: eventType,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          messageType: ctx.input.messageType,
          eventAction: ctx.input.eventAction,
          content: ctx.input.content,
          timestamp: ctx.input.timestamp,
          sender: ctx.input.sender,
          customer: ctx.input.customer,
          channel: ctx.input.channel
        }
      };
    }
  });
