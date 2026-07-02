import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Lists all bots in your Sendbird application with pagination support. Returns bot details including identity, configuration, and AI settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of bots to return per page'),
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
            botUserId: z.string().describe('Unique user ID of the bot'),
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
      applicationId: ctx.config.applicationId
    });

    let result = await client.listBots({
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
    });

    let bots = (result.bots || []).map((entry: Record<string, unknown>) => {
      let bot = (entry.bot || {}) as Record<string, unknown>;
      return {
        botUserId: bot.bot_userid as string,
        botNickname: bot.bot_nickname as string,
        botProfileUrl: bot.bot_profile_url as string | undefined,
        botType: bot.bot_type as string | undefined,
        botCallbackUrl: entry.bot_callback_url as string | undefined,
        isPrivacyMode: entry.is_privacy_mode as boolean | undefined,
        enableMarkAsRead: entry.enable_mark_as_read as boolean | undefined
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
