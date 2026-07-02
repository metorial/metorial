import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let channelEvents = SlateTrigger.create(spec, {
  name: 'Channel Events',
  key: 'channel_events',
  description:
    'Triggers on channel lifecycle and membership events, including channel creation, removal, property changes, freeze/unfreeze, user joins, leaves, invitations, and invitation declines.'
})
  .input(
    z.object({
      category: z.string().describe('Webhook event category (e.g., "group_channel:create")'),
      appId: z.string().optional().describe('Sendbird application ID'),
      channelUrl: z.string().optional().describe('Channel URL'),
      channelName: z.string().optional().describe('Channel name'),
      channelCustomType: z.string().optional().describe('Custom type of the channel'),
      channelType: z.string().optional().describe('Channel type (group or open)'),
      users: z
        .array(
          z.object({
            userId: z.string().optional(),
            nickname: z.string().optional()
          })
        )
        .optional()
        .describe('Users involved in the event'),
      inviter: z
        .object({
          userId: z.string().optional(),
          nickname: z.string().optional()
        })
        .optional()
        .describe('User who triggered the invitation')
    })
  )
  .output(
    z.object({
      channelUrl: z.string().optional().describe('Channel URL'),
      channelName: z.string().optional().describe('Channel name'),
      channelCustomType: z.string().optional().describe('Custom type of the channel'),
      users: z
        .array(
          z.object({
            userId: z.string().optional(),
            nickname: z.string().optional()
          })
        )
        .optional()
        .describe('Users involved in the event'),
      inviterUserId: z.string().optional().describe('User ID of the inviter'),
      inviterNickname: z.string().optional().describe('Nickname of the inviter')
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

      let channelEventCategories = [
        'group_channel:create',
        'group_channel:changed',
        'group_channel:remove',
        'group_channel:freeze_unfreeze',
        'group_channel:invite',
        'group_channel:decline_invite',
        'group_channel:join',
        'group_channel:leave',
        'open_channel:create',
        'open_channel:remove',
        'open_channel:enter',
        'open_channel:exit'
      ];

      let allEvents = [...new Set([...existingEvents, ...channelEventCategories])];

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
          addedEvents: channelEventCategories
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

      // Filter for channel lifecycle and membership events only
      let isChannelEvent =
        category.includes('channel:create') ||
        category.includes('channel:changed') ||
        category.includes('channel:remove') ||
        category.includes('channel:freeze_unfreeze') ||
        category.includes('channel:invite') ||
        category.includes('channel:decline_invite') ||
        category.includes('channel:join') ||
        category.includes('channel:leave') ||
        category.includes('channel:enter') ||
        category.includes('channel:exit');

      if (!isChannelEvent) {
        return { inputs: [] };
      }

      let channel = (data.channel || {}) as Record<string, unknown>;
      let members = (data.members || data.users || []) as Record<string, unknown>[];
      let inviter = (data.inviter || {}) as Record<string, unknown>;

      let users = members.map(m => ({
        userId: m.user_id as string | undefined,
        nickname: m.nickname as string | undefined
      }));

      return {
        inputs: [
          {
            category,
            appId: data.app_id as string | undefined,
            channelUrl: channel.channel_url as string | undefined,
            channelName: channel.name as string | undefined,
            channelCustomType: channel.custom_type as string | undefined,
            channelType: data.channel_type as string | undefined,
            users,
            inviter: inviter.user_id
              ? {
                  userId: inviter.user_id as string | undefined,
                  nickname: inviter.nickname as string | undefined
                }
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.category.replace(':', '.').toLowerCase();
      let eventId = `${ctx.input.category}-${ctx.input.channelUrl ?? ''}-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          channelUrl: ctx.input.channelUrl,
          channelName: ctx.input.channelName,
          channelCustomType: ctx.input.channelCustomType,
          users: ctx.input.users,
          inviterUserId: ctx.input.inviter?.userId,
          inviterNickname: ctx.input.inviter?.nickname
        }
      };
    }
  })
  .build();
