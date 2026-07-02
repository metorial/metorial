import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let getChannelStatus = SlateTool.create(spec, {
  name: 'Get Channel Status',
  key: 'get_channel_status',
  description: `Get the status and occupancy details of a specific Ably channel, or list all active channels.
Use this to check if a channel is active, how many connections/subscribers/publishers/presence members it has, or to enumerate all active channels with an optional prefix filter.`,
  instructions: [
    'Requires API Key authentication with "channel-metadata" capability.',
    'To list channels, the "channel-metadata" capability must be associated with the wildcard resource "*".',
    'Querying a specific channel will activate it as a side effect.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z
        .string()
        .optional()
        .describe(
          'Specific channel name to get status for. If omitted, lists active channels.'
        ),
      prefix: z
        .string()
        .optional()
        .describe('When listing channels, filter by channel name prefix'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of channels to list (default: 100, max: 1000)'),
      includeDetails: z
        .boolean()
        .optional()
        .describe(
          'When listing channels, include full channel details with occupancy (default: false, returns names only)'
        )
    })
  )
  .output(
    z.object({
      channelId: z.string().optional().describe('Channel name (single channel mode)'),
      isActive: z.boolean().optional().describe('Whether the channel is currently active'),
      occupancy: z
        .object({
          connections: z.number().optional(),
          subscribers: z.number().optional(),
          publishers: z.number().optional(),
          presenceConnections: z.number().optional(),
          presenceMembers: z.number().optional(),
          presenceSubscribers: z.number().optional()
        })
        .optional()
        .describe('Channel occupancy metrics'),
      channels: z.array(z.any()).optional().describe('List of active channels (list mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token);

    if (ctx.input.channelId) {
      let status = await client.getChannelStatus(ctx.input.channelId);
      let occupancy = status?.status?.occupancy?.metrics || {};

      return {
        output: {
          channelId: status?.channelId || ctx.input.channelId,
          isActive: status?.status?.isActive ?? false,
          occupancy: {
            connections: occupancy.connections,
            subscribers: occupancy.subscribers,
            publishers: occupancy.publishers,
            presenceConnections: occupancy.presenceConnections,
            presenceMembers: occupancy.presenceMembers,
            presenceSubscribers: occupancy.presenceSubscribers
          }
        },
        message: `Channel **${ctx.input.channelId}** is ${status?.status?.isActive ? 'active' : 'inactive'}. Subscribers: ${occupancy.subscribers ?? 0}, Publishers: ${occupancy.publishers ?? 0}, Presence members: ${occupancy.presenceMembers ?? 0}.`
      };
    }

    let channels = await client.listChannels({
      prefix: ctx.input.prefix,
      limit: ctx.input.limit,
      by: ctx.input.includeDetails ? 'value' : 'id'
    });

    return {
      output: {
        channels: channels || []
      },
      message: `Found **${(channels || []).length}** active channel(s)${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}.`
    };
  })
  .build();
