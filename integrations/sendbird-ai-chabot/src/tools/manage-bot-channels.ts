import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBotChannels = SlateTool.create(spec, {
  name: 'Manage Bot Channels',
  key: 'manage_bot_channels',
  description: `Join or leave channels for a bot. Use the "join" action to add the bot to one or more group channels, or "leave" to remove it from a specific channel or all channels.`,
  instructions: [
    'When using "leave" with leaveAll set to true, the bot will leave all channels it has joined.',
    'When using "leave" without leaveAll, provide a channelUrl to leave a specific channel.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the bot'),
      action: z.enum(['join', 'leave']).describe('Whether to join or leave channels'),
      channelUrls: z
        .array(z.string())
        .optional()
        .describe('Channel URLs to join (required for "join" action)'),
      channelUrl: z
        .string()
        .optional()
        .describe('Specific channel URL to leave (for "leave" action)'),
      leaveAll: z
        .boolean()
        .optional()
        .describe('Leave all channels (for "leave" action). If true, channelUrl is ignored.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    let { botUserId, action, channelUrls, channelUrl, leaveAll } = ctx.input;

    if (action === 'join') {
      if (!channelUrls || channelUrls.length === 0) {
        throw new Error('channelUrls is required when action is "join"');
      }
      await client.joinChannels(botUserId, channelUrls);
      return {
        output: { success: true, action: 'join' },
        message: `Bot **${botUserId}** joined **${channelUrls.length}** channel(s).`
      };
    } else if (leaveAll) {
      await client.leaveAllChannels(botUserId);
      return {
        output: { success: true, action: 'leave_all' },
        message: `Bot **${botUserId}** left all channels.`
      };
    } else if (channelUrl) {
      await client.leaveChannel(botUserId, channelUrl);
      return {
        output: { success: true, action: 'leave' },
        message: `Bot **${botUserId}** left the specified channel.`
      };
    } else {
      throw new Error(
        'Provide either channelUrl or set leaveAll to true when action is "leave"'
      );
    }
  })
  .build();
