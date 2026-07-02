import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  channelId: z.string().describe('Unique channel identifier'),
  channelUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('Channel display name'),
  type: z
    .string()
    .optional()
    .describe('Channel type (e.g., whatsapp, instagram, facebook, telegram, email, sms)'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapChannel = (ch: any) => ({
  channelId: ch.id,
  channelUrl: ch.url,
  name: ch.name,
  type: ch.type,
  createdAt: ch.created_at,
  updatedAt: ch.updated_at
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all connected messaging channels (WhatsApp, Instagram, Facebook Messenger, Telegram, Email, SMS, etc.) in the workspace. Use channel IDs when sending messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of channels to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      channels: z.array(channelSchema).describe('List of connected channels'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listChannels({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let channels = (result.results || []).map(mapChannel);

    return {
      output: {
        channels,
        pagination: result.pagination
      },
      message: `Retrieved **${channels.length}** channel(s).`
    };
  })
  .build();

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve details of a specific connected messaging channel by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to retrieve')
    })
  )
  .output(channelSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getChannel(ctx.input.channelId);

    return {
      output: mapChannel(result),
      message: `Retrieved channel **${result.name || result.id}** (type: ${result.type}).`
    };
  })
  .build();
