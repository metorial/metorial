import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let aiConfigSchema = z
  .object({
    backend: z.string().optional().describe('AI backend provider (e.g., "chatgpt")'),
    model: z.string().optional().describe('AI model to use (e.g., "gpt-4o")'),
    systemMessage: z
      .string()
      .optional()
      .describe('System message defining the bot persona and behavior'),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe('Controls randomness of responses (0-2)'),
    maxTokens: z.number().optional().describe('Maximum number of tokens in the response'),
    topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
    presencePenalty: z
      .number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes tokens based on prior appearance (-2 to 2)'),
    frequencyPenalty: z
      .number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes tokens based on frequency (-2 to 2)')
  })
  .optional()
  .describe('Updated AI configuration for the chatbot');

export let updateBot = SlateTool.create(spec, {
  name: 'Update Bot',
  key: 'update_bot',
  description: `Updates an existing bot's configuration, identity, or AI settings. Only the provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the bot to update'),
      botNickname: z.string().optional().describe('New display nickname'),
      botProfileUrl: z.string().optional().describe('New profile image URL'),
      botCallbackUrl: z.string().optional().describe('New callback URL'),
      botType: z.string().optional().describe('New bot type/category'),
      isPrivacyMode: z.boolean().optional().describe('Enable or disable privacy mode'),
      enableMarkAsRead: z.boolean().optional().describe('Enable or disable auto mark-as-read'),
      showMember: z.boolean().optional().describe('Show member info in callbacks'),
      channelInvitationPreference: z
        .number()
        .optional()
        .describe('Channel invitation preference'),
      ai: aiConfigSchema
    })
  )
  .output(
    z.object({
      botUserId: z.string().describe('User ID of the updated bot'),
      botNickname: z.string().describe('Display nickname of the bot'),
      botProfileUrl: z.string().optional().describe('Profile image URL'),
      botType: z.string().optional().describe('Category of the bot'),
      botCallbackUrl: z.string().optional().describe('Callback URL'),
      isPrivacyMode: z.boolean().optional().describe('Whether privacy mode is enabled'),
      enableMarkAsRead: z.boolean().optional().describe('Whether auto mark-as-read is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    let { botUserId, ...updateParams } = ctx.input;
    let result = await client.updateBot(botUserId, updateParams);

    let bot = result.bot || {};
    return {
      output: {
        botUserId: bot.bot_userid ?? botUserId,
        botNickname: bot.bot_nickname,
        botProfileUrl: bot.bot_profile_url,
        botType: bot.bot_type,
        botCallbackUrl: result.bot_callback_url,
        isPrivacyMode: result.is_privacy_mode,
        enableMarkAsRead: result.enable_mark_as_read
      },
      message: `Successfully updated bot **${bot.bot_nickname || botUserId}**.`
    };
  })
  .build();
