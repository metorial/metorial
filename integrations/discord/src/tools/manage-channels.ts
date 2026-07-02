import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let channelTypeEnum = z
  .enum([
    'GUILD_TEXT',
    'GUILD_VOICE',
    'GUILD_CATEGORY',
    'GUILD_ANNOUNCEMENT',
    'GUILD_STAGE_VOICE',
    'GUILD_FORUM'
  ])
  .describe('Channel type');

let channelTypeMap: Record<string, number> = {
  GUILD_TEXT: 0,
  GUILD_VOICE: 2,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  GUILD_STAGE_VOICE: 13,
  GUILD_FORUM: 15
};

let reverseChannelTypeMap: Record<number, string> = Object.fromEntries(
  Object.entries(channelTypeMap).map(([k, v]) => [v, k])
);

let permissionOverwriteSchema = z.object({
  id: z.string().describe('Role or user ID'),
  type: z.number().describe('0 for role, 1 for member'),
  allow: z.string().optional().describe('Bitwise value of allowed permissions'),
  deny: z.string().optional().describe('Bitwise value of denied permissions')
});

let channelOutputSchema = z.object({
  channelId: z.string().describe('Channel ID'),
  name: z.string().describe('Channel name'),
  type: z.string().describe('Channel type (e.g. GUILD_TEXT, GUILD_VOICE)'),
  guildId: z.string().nullable().describe('Guild ID the channel belongs to'),
  topic: z.string().nullable().describe('Channel topic'),
  position: z.number().nullable().describe('Sorting position of the channel'),
  parentId: z.string().nullable().describe('ID of the parent category channel')
});

let mapChannel = (ch: any) => ({
  channelId: ch.id,
  name: ch.name || '',
  type: reverseChannelTypeMap[ch.type] || String(ch.type),
  guildId: ch.guild_id || null,
  topic: ch.topic || null,
  position: ch.position ?? null,
  parentId: ch.parent_id || null
});

let inputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    guildId: z.string().describe('Guild ID to list channels for')
  }),
  z.object({
    action: z.literal('get'),
    channelId: z.string().describe('Channel ID to retrieve')
  }),
  z.object({
    action: z.literal('create'),
    guildId: z.string().describe('Guild ID to create the channel in'),
    name: z.string().describe('Channel name'),
    type: channelTypeEnum.optional().describe('Channel type (defaults to GUILD_TEXT)'),
    topic: z.string().optional().describe('Channel topic (text-based channels)'),
    bitrate: z.number().optional().describe('Bitrate in bits for voice channels (8000-96000)'),
    userLimit: z
      .number()
      .optional()
      .describe('User limit for voice channels (0-99, 0 means unlimited)'),
    rateLimitPerUser: z
      .number()
      .optional()
      .describe('Slowmode rate limit in seconds (0-21600)'),
    position: z.number().optional().describe('Sorting position of the channel'),
    permissionOverwrites: z
      .array(permissionOverwriteSchema)
      .optional()
      .describe('Permission overwrites for the channel'),
    parentId: z
      .string()
      .optional()
      .describe('ID of the parent category to nest this channel under'),
    nsfw: z.boolean().optional().describe('Whether the channel is NSFW')
  }),
  z.object({
    action: z.literal('update'),
    channelId: z.string().describe('Channel ID to update'),
    name: z.string().optional().describe('New channel name'),
    type: channelTypeEnum
      .optional()
      .describe('New channel type (limited conversions supported by Discord)'),
    topic: z.string().optional().describe('New channel topic'),
    bitrate: z.number().optional().describe('New bitrate for voice channels'),
    userLimit: z.number().optional().describe('New user limit for voice channels'),
    rateLimitPerUser: z.number().optional().describe('New slowmode rate limit in seconds'),
    position: z.number().optional().describe('New sorting position'),
    permissionOverwrites: z
      .array(permissionOverwriteSchema)
      .optional()
      .describe('New permission overwrites (replaces existing)'),
    parentId: z
      .string()
      .nullable()
      .optional()
      .describe('New parent category ID, or null to remove from category'),
    nsfw: z.boolean().optional().describe('Whether the channel is NSFW')
  }),
  z.object({
    action: z.literal('delete'),
    channelId: z.string().describe('Channel ID to delete')
  })
]);

let outputSchema = z.object({
  channel: channelOutputSchema
    .optional()
    .describe('Single channel result (for get, create, update)'),
  channels: z
    .array(channelOutputSchema)
    .optional()
    .describe('List of channels (for list action)')
});

export let manageChannels = SlateTool.create(spec, {
  name: 'Manage Channels',
  key: 'manage_channels',
  description: `List, get, create, update, or delete channels in a Discord guild. Supports text, voice, category, announcement, stage, and forum channel types.`,
  instructions: [
    'Use action **"list"** with a guildId to retrieve all channels in a guild.',
    'Use action **"get"** with a channelId to fetch details of a specific channel.',
    'Use action **"create"** with a guildId and name to create a new channel. Defaults to GUILD_TEXT if type is not specified.',
    'Use action **"update"** with a channelId and the fields you want to change.',
    'Use action **"delete"** with a channelId to permanently delete a channel. This cannot be undone.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageChannels)
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input as any;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action } = input;

    if (action === 'list') {
      let { guildId } = input;
      let channels = await client.getGuildChannels(guildId);
      let mapped = channels.map(mapChannel);

      return {
        output: { channels: mapped },
        message: `Found **${mapped.length}** channels in guild \`${guildId}\`.`
      };
    }

    if (action === 'get') {
      let { channelId } = input;
      let channel = await client.getChannel(channelId);

      return {
        output: { channel: mapChannel(channel) },
        message: `Retrieved channel **${channel.name}** (\`${channel.id}\`).`
      };
    }

    if (action === 'create') {
      let {
        guildId,
        name,
        type,
        topic,
        bitrate,
        userLimit,
        rateLimitPerUser,
        position,
        permissionOverwrites,
        parentId,
        nsfw
      } = input;

      let data: Record<string, any> = { name };

      if (type) data.type = channelTypeMap[type];
      if (topic !== undefined) data.topic = topic;
      if (bitrate !== undefined) data.bitrate = bitrate;
      if (userLimit !== undefined) data.user_limit = userLimit;
      if (rateLimitPerUser !== undefined) data.rate_limit_per_user = rateLimitPerUser;
      if (position !== undefined) data.position = position;
      if (permissionOverwrites !== undefined)
        data.permission_overwrites = permissionOverwrites;
      if (parentId !== undefined) data.parent_id = parentId;
      if (nsfw !== undefined) data.nsfw = nsfw;

      let channel = await client.createGuildChannel(guildId, data);

      return {
        output: { channel: mapChannel(channel) },
        message: `Created ${type || 'GUILD_TEXT'} channel **${channel.name}** (\`${channel.id}\`) in guild \`${guildId}\`.`
      };
    }

    if (action === 'update') {
      let {
        channelId,
        name,
        type,
        topic,
        bitrate,
        userLimit,
        rateLimitPerUser,
        position,
        permissionOverwrites,
        parentId,
        nsfw
      } = input;

      let data: Record<string, any> = {};

      if (name !== undefined) data.name = name;
      if (type !== undefined) data.type = channelTypeMap[type];
      if (topic !== undefined) data.topic = topic;
      if (bitrate !== undefined) data.bitrate = bitrate;
      if (userLimit !== undefined) data.user_limit = userLimit;
      if (rateLimitPerUser !== undefined) data.rate_limit_per_user = rateLimitPerUser;
      if (position !== undefined) data.position = position;
      if (permissionOverwrites !== undefined)
        data.permission_overwrites = permissionOverwrites;
      if (parentId !== undefined) data.parent_id = parentId;
      if (nsfw !== undefined) data.nsfw = nsfw;

      let channel = await client.modifyChannel(channelId, data);

      return {
        output: { channel: mapChannel(channel) },
        message: `Updated channel **${channel.name}** (\`${channel.id}\`).`
      };
    }

    // action === 'delete'
    let { channelId } = input;
    let channel = await client.getChannel(channelId);
    let channelName = channel.name;
    await client.deleteChannel(channelId);

    return {
      output: {
        channel: mapChannel(channel)
      },
      message: `Deleted channel **${channelName}** (\`${channelId}\`).`
    };
  })
  .build();
