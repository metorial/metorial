import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `Lists channels in your Heartbeat community with optional filtering by type or archived status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of channels per page (1-100)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last channel ID from the previous page'),
      channelType: z
        .enum(['thread', 'chat', 'voice'])
        .optional()
        .describe('Filter by channel type'),
      archived: z
        .enum(['all', 'active', 'archived'])
        .optional()
        .describe('Filter by archived status')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelId: z.string().describe('Channel ID'),
            name: z.string().describe('Channel name'),
            channelType: z.string().describe('Channel type (thread, chat, or voice)'),
            emoji: z.string().describe('Channel emoji'),
            isReadOnly: z.boolean().describe('Whether the channel is read-only'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of channels'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listChannels({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      channelType: ctx.input.channelType,
      archived: ctx.input.archived
    });

    let channels = result.data.map(c => ({
      channelId: c.id,
      name: c.name,
      channelType: c.channelType,
      emoji: c.emoji,
      isReadOnly: c.isReadOnly,
      createdAt: c.createdAt
    }));

    return {
      output: {
        channels,
        hasMore: result.hasMore
      },
      message: `Found ${channels.length} channel(s).${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
