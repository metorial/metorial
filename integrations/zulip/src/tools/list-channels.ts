import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  channelId: z.number().describe('Unique channel (stream) ID'),
  name: z.string().describe('Channel name'),
  description: z.string().describe('Channel description'),
  isPrivate: z.boolean().describe('Whether the channel is invite-only'),
  dateCreated: z.number().optional().describe('Unix timestamp when the channel was created'),
  messageRetentionDays: z
    .number()
    .nullable()
    .optional()
    .describe('Message retention policy in days, null means use organization default')
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all channels (streams) visible to the authenticated user. Includes both subscribed and public channels.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includePublic: z
        .boolean()
        .optional()
        .describe('Include public channels. Defaults to true'),
      includeSubscribed: z
        .boolean()
        .optional()
        .describe('Include channels the user is subscribed to. Defaults to true')
    })
  )
  .output(
    z.object({
      channels: z.array(channelSchema).describe('List of channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    let result = await client.getChannels({
      includePublic: ctx.input.includePublic,
      includeSubscribed: ctx.input.includeSubscribed
    });

    let channels = (result.streams || []).map((s: any) => ({
      channelId: s.stream_id,
      name: s.name,
      description: s.description || '',
      isPrivate: s.invite_only,
      dateCreated: s.date_created,
      messageRetentionDays: s.message_retention_days
    }));

    return {
      output: { channels },
      message: `Found ${channels.length} channel(s)`
    };
  })
  .build();
