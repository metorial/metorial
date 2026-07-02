import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageChatSettings = SlateTool.create(spec, {
  name: 'Manage Chat Settings',
  key: 'manage_chat_settings',
  description: `View and update chat settings for a channel. Configure emote-only mode, follower-only mode, slow mode, subscriber-only mode, and unique chat mode.`,
  instructions: [
    'Use action "get" to view current settings, or "update" to change them.',
    'Each mode can be independently toggled on/off.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      action: z.enum(['get', 'update']).describe('Whether to get or update chat settings'),
      emoteMode: z.boolean().optional().describe('Enable emote-only mode'),
      followerMode: z.boolean().optional().describe('Enable follower-only mode'),
      followerModeDurationMinutes: z
        .number()
        .optional()
        .describe('Minimum follow time in minutes (0 = any follower)'),
      slowMode: z.boolean().optional().describe('Enable slow mode'),
      slowModeWaitTimeSeconds: z
        .number()
        .optional()
        .describe('Time in seconds between messages (3-120)'),
      subscriberMode: z.boolean().optional().describe('Enable subscriber-only mode'),
      uniqueChatMode: z
        .boolean()
        .optional()
        .describe('Enable unique-message-only mode (no duplicate messages)')
    })
  )
  .output(
    z.object({
      emoteMode: z.boolean(),
      followerMode: z.boolean(),
      followerModeDurationMinutes: z.number().optional(),
      slowMode: z.boolean(),
      slowModeWaitTimeSeconds: z.number().optional(),
      subscriberMode: z.boolean(),
      uniqueChatMode: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
    let user = await client.getAuthenticatedUser();

    if (ctx.input.action === 'get') {
      let settings = await client.getChatSettings(ctx.input.broadcasterId, user.id);

      return {
        output: {
          emoteMode: settings.emote_mode,
          followerMode: settings.follower_mode,
          followerModeDurationMinutes: settings.follower_mode_duration ?? undefined,
          slowMode: settings.slow_mode,
          slowModeWaitTimeSeconds: settings.slow_mode_wait_time ?? undefined,
          subscriberMode: settings.subscriber_mode,
          uniqueChatMode: settings.unique_chat_mode
        },
        message: `Chat settings retrieved for channel \`${ctx.input.broadcasterId}\``
      };
    }

    let settings = await client.updateChatSettings(ctx.input.broadcasterId, user.id, {
      emoteMode: ctx.input.emoteMode,
      followerMode: ctx.input.followerMode,
      followerModeDuration: ctx.input.followerModeDurationMinutes,
      slowMode: ctx.input.slowMode,
      slowModeWaitTime: ctx.input.slowModeWaitTimeSeconds,
      subscriberMode: ctx.input.subscriberMode,
      uniqueChatMode: ctx.input.uniqueChatMode
    });

    return {
      output: {
        emoteMode: settings.emote_mode,
        followerMode: settings.follower_mode,
        followerModeDurationMinutes: settings.follower_mode_duration ?? undefined,
        slowMode: settings.slow_mode,
        slowModeWaitTimeSeconds: settings.slow_mode_wait_time ?? undefined,
        subscriberMode: settings.subscriber_mode,
        uniqueChatMode: settings.unique_chat_mode
      },
      message: 'Chat settings updated'
    };
  })
  .build();
