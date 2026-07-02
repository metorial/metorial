import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBot = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieves detailed information about a specific bot by its user ID, including identity, configuration, AI settings, and callback URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the bot to retrieve')
    })
  )
  .output(
    z.object({
      botUserId: z.string().describe('Unique user ID of the bot'),
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
      applicationId: ctx.config.applicationId
    });

    let result = await client.getBot(ctx.input.botUserId);

    let bot = (result.bot || {}) as Record<string, unknown>;
    return {
      output: {
        botUserId: (bot.bot_userid as string) ?? ctx.input.botUserId,
        botNickname: bot.bot_nickname as string,
        botProfileUrl: bot.bot_profile_url as string | undefined,
        botType: bot.bot_type as string | undefined,
        botToken: bot.bot_token as string | undefined,
        botCallbackUrl: result.bot_callback_url as string | undefined,
        isPrivacyMode: result.is_privacy_mode as boolean | undefined,
        enableMarkAsRead: result.enable_mark_as_read as boolean | undefined,
        showMember: result.show_member as boolean | undefined,
        channelInvitationPreference: result.channel_invitation_preference as number | undefined
      },
      message: `Retrieved bot **${bot.bot_nickname || ctx.input.botUserId}**.`
    };
  })
  .build();
