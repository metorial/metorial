import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  url: z.string().nullable().optional().describe('URL to the social media profile')
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all connected social media channels for a team. Returns channel details including name, social network type, and connection status. Supports Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube, Threads, Mastodon, and Bluesky.`,
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
      teamId: z.string().describe('ID of the team to list channels for'),
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
    let channels = (result.data || result || []).map((c: any) => ({
      channelId: c.id,
      name: c.name || '',
      picture: c.picture || null,
      socialNetwork: c.social_network || '',
      method: c.method,
      status: c.status,
      scheduleCount: c.schedules,
      isGroup: c.is_group,
      externalId: c.external_id,
      url: c.url || null
    }));

    return {
      output: { channels },
      message: `Found ${channels.length} connected channel(s).`
    };
  });
