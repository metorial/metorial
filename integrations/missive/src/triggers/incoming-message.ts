import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incomingMessage = SlateTrigger.create(spec, {
  name: 'Incoming Message',
  key: 'incoming_message',
  description:
    'Triggered when a new message is received across email, SMS, WhatsApp, Facebook Messenger, or Twilio Chat channels.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of incoming message event'),
      ruleId: z.string().describe('Webhook rule ID'),
      conversationId: z.string().optional().describe('Conversation ID'),
      messageId: z.string().optional().describe('Latest message ID'),
      raw: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('Conversation ID'),
      conversationSubject: z.string().optional().describe('Conversation subject'),
      messageId: z.string().optional().describe('Latest message ID'),
      messageSubject: z.string().optional().describe('Message subject'),
      messagePreview: z.string().optional().describe('Message preview text'),
      messageBody: z.string().optional().describe('Full message body'),
      messageType: z.string().optional().describe('Message type'),
      fromAddress: z.string().optional().describe('Sender address'),
      fromName: z.string().optional().describe('Sender name'),
      toAddresses: z
        .array(
          z.object({
            address: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Recipient addresses'),
      teamId: z.string().optional().describe('Team ID'),
      teamName: z.string().optional().describe('Team name'),
      organizationId: z.string().optional().describe('Organization ID'),
      organizationName: z.string().optional().describe('Organization name'),
      sharedLabelIds: z.array(z.string()).optional().describe('Applied shared label IDs'),
      assigneeIds: z.array(z.string()).optional().describe('Assignee user IDs'),
      deliveredAt: z.number().optional().describe('Message delivery timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let hookTypes = [
        'incoming_email',
        'incoming_sms_message',
        'incoming_whatsapp_message',
        'incoming_facebook_message',
        'incoming_twilio_chat_message'
      ];

      let hookIds: string[] = [];
      for (let hookType of hookTypes) {
        try {
          let data = await client.createHook({
            type: hookType,
            url: ctx.input.webhookBaseUrl
          });
          let hookId = data.hooks?.id || data.id;
          if (hookId) hookIds.push(hookId);
        } catch (_e: any) {
          // Some hook types may not be available depending on configuration
        }
      }

      return {
        registrationDetails: { hookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let hookIds = (ctx.input.registrationDetails as any)?.hookIds || [];
      for (let hookId of hookIds) {
        try {
          await client.deleteHook(hookId);
        } catch (_e: any) {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let conversationId = data.conversation?.id;
      let messageId = data.latest_message?.id;
      let ruleType = data.rule?.type || 'incoming_message';

      return {
        inputs: [
          {
            eventType: ruleType,
            ruleId: data.rule?.id || '',
            conversationId,
            messageId,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw;
      let conversation = raw.conversation || {};
      let message = raw.latest_message || {};

      return {
        type: ctx.input.eventType || 'incoming_message',
        id:
          ctx.input.messageId ||
          ctx.input.ruleId ||
          `${ctx.input.conversationId}-${Date.now()}`,
        output: {
          conversationId: conversation.id,
          conversationSubject: conversation.subject,
          messageId: message.id,
          messageSubject: message.subject,
          messagePreview: message.preview,
          messageBody: message.body,
          messageType: message.type,
          fromAddress: message.from_field?.address,
          fromName: message.from_field?.name,
          toAddresses: message.to_fields?.map((f: any) => ({
            address: f.address,
            name: f.name
          })),
          teamId: conversation.team?.id,
          teamName: conversation.team?.name,
          organizationId: conversation.organization?.id,
          organizationName: conversation.organization?.name,
          sharedLabelIds: conversation.shared_labels?.map((l: any) => l.id),
          assigneeIds: conversation.assignees?.map((a: any) => a.id),
          deliveredAt: message.delivered_at
        }
      };
    }
  })
  .build();
