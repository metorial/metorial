import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageStatus = SlateTrigger.create(spec, {
  name: 'Message Status Update',
  key: 'message_status',
  description:
    'Triggered when the status of a sent message changes: sent (session or template), delivered, read, replied, or failed.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type identifier.'),
      eventId: z.string().describe('Unique event identifier.'),
      whatsappMessageId: z.string().optional().describe('WhatsApp message ID (WAMID).'),
      localMessageId: z.string().optional().describe('Local message ID for tracking.'),
      conversationId: z.string().optional().describe('Conversation identifier.'),
      ticketId: z.string().optional().describe('Ticket identifier.'),
      text: z.string().optional().describe('Message text content.'),
      messageType: z.string().optional().describe('Message content type.'),
      statusString: z
        .string()
        .optional()
        .describe('Status string (SENT, Delivered, Read, Failed, etc.).'),
      timestamp: z.string().optional().describe('Event timestamp.'),
      operatorEmail: z.string().optional().describe('Operator email.'),
      templateId: z.string().optional().describe('Template ID (for template messages).'),
      templateName: z.string().optional().describe('Template name (for template messages).'),
      failedCode: z
        .string()
        .optional()
        .describe('Failure code from Meta (for failed messages).'),
      failedDetail: z
        .string()
        .optional()
        .describe('Failure detail from Meta (for failed messages).')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message identifier.'),
      whatsappMessageId: z.string().optional().describe('WhatsApp message ID (WAMID).'),
      localMessageId: z.string().optional().describe('Local message ID for tracking.'),
      conversationId: z.string().optional().describe('Conversation identifier.'),
      ticketId: z.string().optional().describe('Ticket identifier.'),
      text: z.string().optional().describe('Message text content.'),
      messageType: z.string().optional().describe('Message content type.'),
      status: z
        .string()
        .optional()
        .describe('Message status (SENT, Delivered, Read, Failed, etc.).'),
      timestamp: z.string().optional().describe('Event timestamp.'),
      operatorEmail: z.string().optional().describe('Operator email.'),
      templateId: z.string().optional().describe('Template ID (for template messages).'),
      templateName: z.string().optional().describe('Template name (for template messages).'),
      failedCode: z
        .string()
        .optional()
        .describe('Failure code from Meta (for failed messages).'),
      failedDetail: z
        .string()
        .optional()
        .describe('Failure detail from Meta (for failed messages).')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.eventType || '';
      let statusEvents = [
        'sessionMessageSent',
        'templateMessageSent_v2',
        'templateMessageSent',
        'sentMessageDELIVERED_v2',
        'sentMessageDELIVERED',
        'sentMessageREAD_v2',
        'sentMessageREAD',
        'sentMessageREPLIED_v2',
        'sentMessageREPLIED',
        'templateMessageFailed'
      ];

      if (!statusEvents.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: data.id || data.whatsappMessageId || data.localMessageId || '',
            whatsappMessageId: data.whatsappMessageId,
            localMessageId: data.localMessageId,
            conversationId: data.conversationId,
            ticketId: data.ticketId,
            text: data.text,
            messageType: data.type,
            statusString: data.statusString,
            timestamp: data.timestamp?.toString(),
            operatorEmail: data.operatorEmail,
            templateId: data.templateId,
            templateName: data.templateName,
            failedCode: data.failedCode,
            failedDetail: data.failedDetail
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        sessionMessageSent: 'message.session_sent',
        templateMessageSent_v2: 'message.template_sent',
        templateMessageSent: 'message.template_sent',
        sentMessageDELIVERED_v2: 'message.delivered',
        sentMessageDELIVERED: 'message.delivered',
        sentMessageREAD_v2: 'message.read',
        sentMessageREAD: 'message.read',
        sentMessageREPLIED_v2: 'message.replied',
        sentMessageREPLIED: 'message.replied',
        templateMessageFailed: 'message.failed'
      };

      let type = eventTypeMap[ctx.input.eventType] || `message.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.eventId,
          whatsappMessageId: ctx.input.whatsappMessageId,
          localMessageId: ctx.input.localMessageId,
          conversationId: ctx.input.conversationId,
          ticketId: ctx.input.ticketId,
          text: ctx.input.text,
          messageType: ctx.input.messageType,
          status: ctx.input.statusString,
          timestamp: ctx.input.timestamp,
          operatorEmail: ctx.input.operatorEmail,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          failedCode: ctx.input.failedCode,
          failedDetail: ctx.input.failedDetail
        }
      };
    }
  })
  .build();
