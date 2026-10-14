import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Lists all bots in your Sendbird application with pagination support. Returns bot details including identity and callback configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .refine(
          value => Number.isSafeInteger(value) && value >= 1 && value <= 100,
          'Use a whole number from 1 to 100'
        )
        .optional()
        .describe('Maximum number of bots to return per page (1-100; default 10)'),
      paginationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to fetch the next page')
    })
  )
  .output(
    z.object({
      bots: z
        .array(
          z.object({
            botUserId: z.string().min(1).max(80).describe('Unique user ID of the bot'),
            botNickname: z.string().describe('Display nickname'),
            botProfileUrl: z.string().optional().describe('Profile image URL'),
            botType: z.string().optional().describe('Category of the bot'),
            botCallbackUrl: z.string().optional().describe('Callback URL'),
            isPrivacyMode: z.boolean().optional().describe('Whether privacy mode is enabled'),
            enableMarkAsRead: z
              .boolean()
              .optional()
              .describe('Whether auto mark-as-read is enabled')
          })
        )
        .describe('List of bots'),
      nextPaginationToken: z
        .string()
        .optional()
        .describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.auth.applicationId ?? ctx.config.applicationId
    });

    let result = await client.listBots({
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
    });

    let bots = result.bots.map(entry => {
      let bot = entry.bot;
      return {
        botUserId: bot.bot_userid,
        botNickname: bot.bot_nickname,
        botProfileUrl: bot.bot_profile_url,
        botType: bot.bot_type,
        botCallbackUrl: entry.bot_callback_url,
        isPrivacyMode: entry.is_privacy_mode,
        enableMarkAsRead: entry.enable_mark_as_read
      };
    });

    return {
      output: {
        bots,
        nextPaginationToken: result.next || undefined
      },
      message: `Found **${bots.length}** bot(s).${result.next ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
