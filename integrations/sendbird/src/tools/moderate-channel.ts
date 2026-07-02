import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let moderateChannel = SlateTool.create(spec, {
  name: 'Moderate Channel',
  key: 'moderate_channel',
  description: `Perform moderation actions on a channel: ban, unban, mute, unmute users, or freeze/unfreeze the channel. Works with both group and open channels.`,
  instructions: [
    'Use "ban" to prevent a user from entering the channel for a specified duration.',
    'Use "mute" to silence a user in the channel (they can still read but not send messages).',
    'Use "freeze" to prevent all non-operators from sending messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelType: z.enum(['group_channels', 'open_channels']).describe('Type of channel'),
      channelUrl: z.string().describe('URL of the channel'),
      action: z
        .enum(['ban', 'unban', 'mute', 'unmute', 'freeze', 'unfreeze'])
        .describe('Moderation action to perform'),
      targetUserId: z
        .string()
        .optional()
        .describe('User ID to ban/unban/mute/unmute (required for user actions)'),
      seconds: z
        .number()
        .optional()
        .describe('Duration in seconds for ban/mute (-1 for indefinite)'),
      description: z.string().optional().describe('Reason for the ban/mute')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      action: z.string().describe('The moderation action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let { channelType, channelUrl, action, targetUserId } = ctx.input;

    switch (action) {
      case 'ban':
        await client.banUserFromChannel(channelType, channelUrl, {
          userId: targetUserId!,
          seconds: ctx.input.seconds,
          description: ctx.input.description
        });
        break;
      case 'unban':
        await client.unbanUserFromChannel(channelType, channelUrl, targetUserId!);
        break;
      case 'mute':
        await client.muteUserInChannel(channelType, channelUrl, {
          userId: targetUserId!,
          seconds: ctx.input.seconds,
          description: ctx.input.description
        });
        break;
      case 'unmute':
        await client.unmuteUserInChannel(channelType, channelUrl, targetUserId!);
        break;
      case 'freeze':
        await client.freezeChannel(channelType, channelUrl, true);
        break;
      case 'unfreeze':
        await client.freezeChannel(channelType, channelUrl, false);
        break;
    }

    let actionMsg =
      action === 'freeze'
        ? `Froze channel **${channelUrl}**.`
        : action === 'unfreeze'
          ? `Unfroze channel **${channelUrl}**.`
          : `${action.charAt(0).toUpperCase() + action.slice(1)}${action.endsWith('e') ? 'd' : 'ned'} user **${targetUserId}** in channel **${channelUrl}**.`;

    return {
      output: {
        success: true,
        action
      },
      message: actionMsg
    };
  })
  .build();
