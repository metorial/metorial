import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messagesTrigger = SlateTrigger.create(spec, {
  name: 'Message Activity',
  key: 'message_activity',
  description:
    'Triggered on direct messaging activity for Facebook and Instagram. Covers new messages, message read receipts, and reactions on messages. Requires the Messaging Add-On.'
})
  .input(
    z.object({
      action: z.string().describe('Webhook action type'),
      subAction: z
        .string()
        .optional()
        .describe('Sub-action: messageCreated, messageRead, reactionCreated, reactionDeleted'),
      hookId: z.string().optional().describe('Webhook hook ID'),
      conversationId: z.string().optional().describe('Conversation identifier'),
      message: z.string().optional().describe('Message content'),
      senderDetails: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Sender information'),
      messageType: z.string().optional().describe('Message type: received, sent, deleted'),
      platform: z.string().optional().describe('Platform: facebook or instagram'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      subAction: z
        .string()
        .optional()
        .describe(
          'Sub-action type: messageCreated, messageRead, reactionCreated, reactionDeleted'
        ),
      conversationId: z.string().optional().describe('Conversation ID'),
      message: z.string().optional().describe('Message content'),
      senderDetails: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Sender information'),
      messageType: z.string().optional().describe('Message type: received, sent, deleted'),
      platform: z.string().optional().describe('Platform the message was on'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      let result = await client.registerWebhook({
        action: 'messages',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          action: 'messages',
          hookId: result.hookId || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      await client.unregisterWebhook({
        action: ctx.input.registrationDetails.action || 'messages'
      });
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'messages',
            subAction: data.subAction,
            hookId: data.hookId,
            conversationId: data.conversationId,
            message: data.message,
            senderDetails: data.senderDetails,
            messageType: data.type,
            platform: data.platform,
            refId: data.refId,
            created: data.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let subAction = ctx.input.subAction || 'unknown';
      let eventTypeMap: Record<string, string> = {
        messageCreated: 'message.created',
        messageRead: 'message.read',
        reactionCreated: 'message.reaction_created',
        reactionDeleted: 'message.reaction_deleted'
      };
      let eventType = eventTypeMap[subAction] || `message.${subAction}`;

      return {
        type: eventType,
        id: ctx.input.hookId || `message-${ctx.input.conversationId}-${Date.now()}`,
        output: {
          subAction: ctx.input.subAction,
          conversationId: ctx.input.conversationId,
          message: ctx.input.message,
          senderDetails: ctx.input.senderDetails,
          messageType: ctx.input.messageType,
          platform: ctx.input.platform,
          refId: ctx.input.refId,
          created: ctx.input.created
        }
      };
    }
  })
  .build();
