import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

let openChannelSchema = z.object({
  channelUrl: z.string().describe('Unique channel URL'),
  name: z.string().describe('Channel name'),
  coverUrl: z.string().describe('Cover image URL'),
  customType: z.string().describe('Custom channel type'),
  participantCount: z.number().describe('Number of current participants'),
  isFrozen: z.boolean().describe('Whether the channel is frozen'),
  createdAt: z.number().describe('Unix timestamp of creation')
});

export let createOpenChannel = SlateTool.create(spec, {
  name: 'Create Open Channel',
  key: 'create_open_channel',
  description: `Create a new open channel. Open channels are public channels that any user can enter and participate in, suitable for large-scale broadcasts or live event chats.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Channel name'),
      channelUrl: z
        .string()
        .optional()
        .describe('Custom channel URL. Auto-generated if not provided.'),
      coverUrl: z.string().optional().describe('URL of the channel cover image'),
      customType: z.string().optional().describe('Custom channel type for categorization'),
      operatorIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to designate as operators')
    })
  )
  .output(openChannelSchema)
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.createOpenChannel({
      name: ctx.input.name,
      channelUrl: ctx.input.channelUrl,
      coverUrl: ctx.input.coverUrl,
      customType: ctx.input.customType,
      operatorIds: ctx.input.operatorIds
    });

    return {
      output: {
        channelUrl: result.channel_url,
        name: result.name ?? '',
        coverUrl: result.cover_url ?? '',
        customType: result.custom_type ?? '',
        participantCount: result.participant_count ?? 0,
        isFrozen: result.freeze ?? false,
        createdAt: result.created_at ?? 0
      },
      message: `Created open channel **${result.name || result.channel_url}**.`
    };
  })
  .build();

export let listOpenChannels = SlateTool.create(spec, {
  name: 'List Open Channels',
  key: 'list_open_channels',
  description: `List open channels with filtering and pagination. Filter by name or custom type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results to return (default 10, max 100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter channels whose name contains this string'),
      customType: z.string().optional().describe('Filter by custom type'),
      showFrozen: z.boolean().optional().describe('Include frozen channels')
    })
  )
  .output(
    z.object({
      channels: z.array(openChannelSchema).describe('List of open channels'),
      nextToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.listOpenChannels({
      limit: ctx.input.limit,
      token: ctx.input.nextToken,
      nameContains: ctx.input.nameContains,
      customType: ctx.input.customType,
      showFrozen: ctx.input.showFrozen
    });

    let channels = (result.channels ?? []).map((ch: any) => ({
      channelUrl: ch.channel_url,
      name: ch.name ?? '',
      coverUrl: ch.cover_url ?? '',
      customType: ch.custom_type ?? '',
      participantCount: ch.participant_count ?? 0,
      isFrozen: ch.freeze ?? false,
      createdAt: ch.created_at ?? 0
    }));

    return {
      output: {
        channels,
        nextToken: result.next || undefined
      },
      message: `Found **${channels.length}** open channel(s).${result.next ? ' More results available.' : ''}`
    };
  })
  .build();
