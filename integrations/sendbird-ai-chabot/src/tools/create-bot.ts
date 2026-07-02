import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let aiConfigSchema = z
  .object({
    backend: z.string().optional().describe('AI backend provider (e.g., "chatgpt")'),
    model: z
      .string()
      .optional()
      .describe('AI model to use (e.g., "gpt-4o", "gpt-4o-2024-05-13")'),
    systemMessage: z
      .string()
      .optional()
      .describe('System message defining the bot persona and behavior'),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe(
        'Controls randomness of responses (0-2). Higher values make output more random.'
      ),
    maxTokens: z.number().optional().describe('Maximum number of tokens in the response'),
    topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
    presencePenalty: z
      .number()
      .min(-2)
      .max(2)
      .optional()
      .describe(
        'Penalizes new tokens based on whether they appear in the text so far (-2 to 2)'
      ),
    frequencyPenalty: z
      .number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes new tokens based on their frequency in the text so far (-2 to 2)')
  })
  .optional()
  .describe('AI configuration for the chatbot. Required for AI-powered bots.');

export let createBot = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description: `Creates a new AI chatbot in your Sendbird application. Configure the bot's identity, AI backend, model, system message, and LLM parameters. Up to 10 AI chatbots can be created per application by default.`,
  instructions: [
    'For AI chatbots, provide the "ai" configuration object with at least a backend and model.',
    'If the "ai" object is specified, the botCallbackUrl is optional.'
  ],
  constraints: [
    'Default limit of 10 AI chatbots per application.',
    'The botUserId must be unique within the application.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('Unique user ID for the bot'),
      botNickname: z.string().describe('Display nickname for the bot'),
      botProfileUrl: z.string().optional().describe('URL of the bot profile image'),
      botCallbackUrl: z
        .string()
        .optional()
        .describe('URL where Sendbird sends event callbacks when a user messages the bot'),
      botType: z
        .string()
        .optional()
        .describe('Category or type of the bot (e.g., "AI assistant", "marketer")'),
      isPrivacyMode: z
        .boolean()
        .optional()
        .describe(
          'Whether the bot only receives messages directed at it (true) or all messages (false)'
        ),
      enableMarkAsRead: z
        .boolean()
        .optional()
        .describe('Whether the bot automatically marks messages as read'),
      showMember: z
        .boolean()
        .optional()
        .describe('Whether to include member info in callback payloads'),
      channelInvitationPreference: z
        .number()
        .optional()
        .describe('Channel invitation preference (0 or 1)'),
      ai: aiConfigSchema
    })
  )
  .output(
    z.object({
      botUserId: z.string().describe('Unique user ID of the created bot'),
      botNickname: z.string().describe('Display nickname of the bot'),
      botProfileUrl: z.string().optional().describe('Profile image URL'),
      botType: z.string().optional().describe('Category of the bot'),
      botToken: z.string().optional().describe('Bot token for authentication'),
      botCallbackUrl: z.string().optional().describe('Callback URL for the bot'),
      isPrivacyMode: z.boolean().optional().describe('Whether privacy mode is enabled'),
      enableMarkAsRead: z.boolean().optional().describe('Whether auto mark-as-read is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    let result = await client.createBot(ctx.input);

    let bot = result.bot || {};
    return {
      output: {
        botUserId: bot.bot_userid ?? ctx.input.botUserId,
        botNickname: bot.bot_nickname ?? ctx.input.botNickname,
        botProfileUrl: bot.bot_profile_url,
        botType: bot.bot_type,
        botToken: bot.bot_token,
        botCallbackUrl: result.bot_callback_url,
        isPrivacyMode: result.is_privacy_mode,
        enableMarkAsRead: result.enable_mark_as_read
      },
      message: `Successfully created bot **${bot.bot_nickname || ctx.input.botNickname}** (${bot.bot_userid || ctx.input.botUserId}).`
    };
  })
  .build();
