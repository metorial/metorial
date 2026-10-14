import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBotChannels = SlateTool.create(spec, {
  name: 'List Bot Channels',
  key: 'list_bot_channels',
  description:
    'Lists group channels a bot has joined, including empty and hidden channels. Use returned channel URLs to send messages or manage membership.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      botUserId: z
        .string()
        .min(1)
        .max(80)
        .describe('Bot user ID. Call list_bots to discover bot IDs.'),
      limit: z
        .number()
        .refine(
          value => Number.isSafeInteger(value) && value >= 1 && value <= 100,
          'Use a whole number from 1 to 100'
        )
        .optional()
        .describe('Maximum channels per page (1-100; default 10)'),
      paginationToken: z
        .string()
        .optional()
        .describe('Next pagination token from a previous response'),
      nameContains: z.string().optional().describe('Case-insensitive channel name filter')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelUrl: z.string(),
          name: z.string(),
          memberCount: z.number().optional(),
          createdAt: z.number().optional().describe('Channel creation time in Unix seconds'),
          customType: z.string().optional()
        })
      ),
      nextPaginationToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.auth.applicationId ?? ctx.config.applicationId
    });
    let result = await client.listBotChannels(ctx.input.botUserId, ctx.input);
    let channels = result.channels.map(channel => ({
      channelUrl: channel.channel_url,
      name: channel.name,
      memberCount: channel.member_count,
      createdAt: channel.created_at,
      customType: channel.custom_type
    }));
    return {
      output: { channels, nextPaginationToken: result.next || undefined },
      message: `Found **${channels.length}** joined group channel(s).`
    };
  })
  .build();
