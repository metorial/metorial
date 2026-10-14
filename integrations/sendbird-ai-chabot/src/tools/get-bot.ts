import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBot = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieves detailed information about a specific bot by its user ID, including identity, callback URL, and channel invitation settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      botUserId: z.string().min(1).max(80).describe('User ID of the bot to retrieve')
    })
  )
  .output(
    z.object({
      botUserId: z.string().min(1).max(80).describe('Unique user ID of the bot'),
      botNickname: z.string().describe('Display nickname'),
      botProfileUrl: z.string().optional().describe('Profile image URL'),
      botType: z.string().optional().describe('Category of the bot'),
      botToken: z.string().optional().describe('Bot token'),
      botCallbackUrl: z.string().optional().describe('Callback URL'),
      isPrivacyMode: z.boolean().optional().describe('Whether privacy mode is enabled'),
      enableMarkAsRead: z
        .boolean()
        .optional()
        .describe('Whether auto mark-as-read is enabled'),
      showMember: z.boolean().optional().describe('Whether member info is shown in callbacks'),
      channelInvitationPreference: z
        .number()
        .optional()
        .describe('Channel invitation preference')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.auth.applicationId ?? ctx.config.applicationId
    });

    let result = await client.getBot(ctx.input.botUserId);

    let bot = result.bot;
    return {
      output: {
        botUserId: bot.bot_userid ?? ctx.input.botUserId,
        botNickname: bot.bot_nickname,
        botProfileUrl: bot.bot_profile_url,
        botType: bot.bot_type,
        botToken: bot.bot_token,
        botCallbackUrl: result.bot_callback_url,
        isPrivacyMode: result.is_privacy_mode,
        enableMarkAsRead: result.enable_mark_as_read,
        showMember: result.show_member,
        channelInvitationPreference: result.channel_invitation_preference
      },
      message: `Retrieved bot **${bot.bot_nickname || ctx.input.botUserId}**.`
    };
  })
  .build();
