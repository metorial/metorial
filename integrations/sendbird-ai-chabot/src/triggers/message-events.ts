import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when messages are sent, updated, or deleted in channels. Covers both group channels and open channels, including bot messages.'
})
  .input(
    z.object({
      category: z
        .string()
        .describe('Webhook event category (e.g., "group_channel:message_send")'),
      appId: z.string().optional().describe('Sendbird application ID'),
      sender: z
        .object({
          userId: z.string().optional(),
          nickname: z.string().optional(),
          profileUrl: z.string().optional()
        })
        .optional()
        .describe('Sender information'),
      channelUrl: z.string().optional().describe('Channel URL where the event occurred'),
      channelName: z.string().optional().describe('Name of the channel'),
      channelType: z.string().optional().describe('Channel type'),
      messageId: z.number().optional().describe('ID of the affected message'),
      messageText: z.string().optional().describe('Text content of the message'),
      messageType: z.string().optional().describe('Message type (MESG, FILE, ADMM)'),
      customType: z.string().optional().describe('Custom message type'),
      createdAt: z.number().optional().describe('Unix timestamp of the message creation'),
      silent: z.boolean().optional().describe('Whether it is a silent message'),
      mentionType: z.string().optional().describe('Mention type'),
      mentionedUsers: z.array(z.string()).optional().describe('List of mentioned user IDs')
    })
  )
  .output(
    z.object({
      senderUserId: z.string().optional().describe('User ID of the sender'),
      senderNickname: z.string().optional().describe('Nickname of the sender'),
      senderProfileUrl: z.string().optional().describe('Profile URL of the sender'),
      channelUrl: z.string().optional().describe('Channel URL where the event occurred'),
      channelName: z.string().optional().describe('Name of the channel'),
      messageId: z.number().optional().describe('ID of the affected message'),
      messageText: z.string().optional().describe('Text content of the message'),
      messageType: z.string().optional().describe('Message type (MESG, FILE, ADMM)'),
      customType: z.string().optional().describe('Custom message type'),
      createdAt: z.number().optional().describe('Unix timestamp of the message creation'),
      silent: z.boolean().optional().describe('Whether it is a silent message'),
      mentionType: z.string().optional().describe('Mention type'),
      mentionedUsers: z.array(z.string()).optional().describe('List of mentioned user IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        applicationId: ctx.config.applicationId
      });

      let existingConfig = await client.getWebhookConfig();
      let existingEvents: string[] = existingConfig.enabled_events || [];

      let messageEventCategories = [
        'group_channel:message_send',
        'group_channel:message_update',
        'group_channel:message_delete',
        'open_channel:message_send',
        'open_channel:message_update',
        'open_channel:message_delete'
      ];

      let allEvents = [...new Set([...existingEvents, ...messageEventCategories])];

      await client.updateWebhookConfig({
        enabled: true,
        url: ctx.input.webhookBaseUrl,
        enabledEvents: allEvents
      });

      return {
        registrationDetails: {
          previousUrl: existingConfig.url || null,
          previousEnabled: existingConfig.enabled ?? false,
          previousEvents: existingEvents,
          addedEvents: messageEventCategories
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        applicationId: ctx.config.applicationId
      });

      let details = ctx.input.registrationDetails as Record<string, unknown>;
      let addedEvents = (details.addedEvents || []) as string[];
      let previousUrl = details.previousUrl as string | null;
      let previousEnabled = details.previousEnabled as boolean;
      let previousEvents = (details.previousEvents || []) as string[];

      if (previousUrl) {
        // Restore previous webhook config minus our added events
        let restoredEvents = previousEvents.filter((e: string) => !addedEvents.includes(e));
        await client.updateWebhookConfig({
          enabled: previousEnabled,
          url: previousUrl,
          enabledEvents: restoredEvents.length > 0 ? restoredEvents : ['*']
        });
      } else {
        await client.updateWebhookConfig({
          enabled: false,
          url: '',
          enabledEvents: []
        });
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let category = (data.category as string) || '';

      // Only process message events
      if (
        !category.includes('message_send') &&
        !category.includes('message_update') &&
        !category.includes('message_delete')
      ) {
        return { inputs: [] };
      }

      let sender = (data.sender || {}) as Record<string, unknown>;
      let payload = (data.payload || {}) as Record<string, unknown>;
      let channel = (data.channel || {}) as Record<string, unknown>;
      let mentionedUsers = ((data.mentioned_users || []) as Record<string, unknown>[]).map(
        u => u.user_id as string
      );

      return {
        inputs: [
          {
            category,
            appId: data.app_id as string | undefined,
            sender: {
              userId: sender.user_id as string | undefined,
              nickname: sender.nickname as string | undefined,
              profileUrl: sender.profile_url as string | undefined
            },
            channelUrl: channel.channel_url as string | undefined,
            channelName: channel.name as string | undefined,
            channelType: data.channel_type as string | undefined,
            messageId: payload.message_id as number | undefined,
            messageText: payload.message as string | undefined,
            messageType: data.type as string | undefined,
            customType: payload.custom_type as string | undefined,
            createdAt: payload.created_at as number | undefined,
            silent: data.silent as boolean | undefined,
            mentionType: data.mention_type as string | undefined,
            mentionedUsers
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.category.replace(':', '.').toLowerCase();
      let eventId = `${ctx.input.category}-${ctx.input.messageId ?? Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          senderUserId: ctx.input.sender?.userId,
          senderNickname: ctx.input.sender?.nickname,
          senderProfileUrl: ctx.input.sender?.profileUrl,
          channelUrl: ctx.input.channelUrl,
          channelName: ctx.input.channelName,
          messageId: ctx.input.messageId,
          messageText: ctx.input.messageText,
          messageType: ctx.input.messageType,
          customType: ctx.input.customType,
          createdAt: ctx.input.createdAt,
          silent: ctx.input.silent,
          mentionType: ctx.input.mentionType,
          mentionedUsers: ctx.input.mentionedUsers
        }
      };
    }
  })
  .build();
