import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  nullableString,
  optionalNumber,
  optionalString,
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseRecord,
  scalarString,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

let channelSchema = z.object({
  channelId: z.string().describe('Unique channel identifier'),
  name: z.string().describe('Channel/account name'),
  picture: z.string().nullable().optional().describe('Channel avatar URL'),
  socialNetwork: z
    .string()
    .describe('Social network type (e.g., instagram, facebook, twitter)'),
  method: z.string().optional().describe('Connection method'),
  status: z.string().optional().describe('Channel connection status'),
  scheduleCount: z.number().optional().describe('Number of scheduled posts'),
  isGroup: z.boolean().optional().describe('Whether this is a group channel'),
  externalId: z.string().optional().describe('External social network account ID'),
  url: z.string().nullable().optional().describe('URL to the social media profile'),
  raw: rawSchema
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all connected social media channels for a team. Returns channel details including name, social network type, and connection status. Supports Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube, Threads, Mastodon, and Bluesky. Call list_teams to discover the team ID.`,
  instructions: [
    'Use the returned channelId values when scheduling posts.',
    'New channels must be connected through the Planly web interface; the API only lists existing channels.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      excludeCompetitors: z
        .boolean()
        .optional()
        .describe('Exclude competitor channels from the list')
    })
  )
  .output(
    z.object({
      channels: z.array(channelSchema).describe('List of connected channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listChannels(ctx.input.teamId, ctx.input.excludeCompetitors);
    let channels = responseArray(responseData(result), 'channels').map(value => {
      let channel = responseRecord(value, 'channel');
      return {
        channelId: requiredString(channel.id, 'channel ID'),
        name: requiredString(channel.name, 'channel name'),
        picture: nullableString(channel.picture),
        socialNetwork: requiredString(channel.social_network, 'channel social network'),
        method: optionalString(channel.method),
        status: scalarString(channel.status),
        scheduleCount: optionalNumber(channel.schedules),
        isGroup: typeof channel.is_group === 'boolean' ? channel.is_group : undefined,
        externalId: optionalString(channel.external_id),
        url: nullableString(channel.url),
        raw: channel
      };
    });
    return { output: { channels }, message: `Found ${channels.length} connected channel(s).` };
  });
