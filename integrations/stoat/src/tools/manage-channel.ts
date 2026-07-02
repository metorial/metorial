import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createChannel = SlateTool.create(spec, {
  name: 'Create Channel',
  key: 'create_channel',
  description: `Create a new text or voice channel within a Revolt server, or create a group DM with specified users.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z
        .string()
        .optional()
        .describe('ID of the server to create the channel in (omit for group DM)'),
      name: z.string().describe('Name for the new channel or group'),
      type: z
        .enum(['Text', 'Voice'])
        .optional()
        .describe('Channel type (only for server channels)'),
      description: z.string().optional().describe('Description for the channel'),
      nsfw: z.boolean().optional().describe('Whether the channel is NSFW'),
      users: z
        .array(z.string())
        .optional()
        .describe('User IDs to add to a group DM (required when creating a group)')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the created channel'),
      channelType: z.string().describe('Type of the channel'),
      name: z.string().describe('Name of the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: any;

    if (ctx.input.serverId) {
      result = await client.createServerChannel(ctx.input.serverId, {
        type: ctx.input.type,
        name: ctx.input.name,
        description: ctx.input.description,
        nsfw: ctx.input.nsfw
      });
    } else {
      result = await client.createGroup({
        name: ctx.input.name,
        description: ctx.input.description,
        users: ctx.input.users ?? [],
        nsfw: ctx.input.nsfw
      });
    }

    return {
      output: {
        channelId: result._id,
        channelType: result.channel_type,
        name: result.name
      },
      message: `Created ${result.channel_type} channel **${result.name}** (\`${result._id}\`)`
    };
  })
  .build();

export let fetchChannel = SlateTool.create(spec, {
  name: 'Fetch Channel',
  key: 'fetch_channel',
  description: `Fetch details about a Revolt channel including its type, name, description, and other properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to fetch')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the channel'),
      channelType: z
        .string()
        .describe(
          'Type of the channel (TextChannel, VoiceChannel, Group, DirectMessage, SavedMessages)'
        ),
      name: z.string().optional().describe('Name of the channel'),
      description: z.string().optional().describe('Description of the channel'),
      serverId: z.string().optional().describe('ID of the server this channel belongs to'),
      nsfw: z.boolean().optional().describe('Whether the channel is NSFW'),
      lastMessageId: z.string().optional().describe('ID of the last message in the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchChannel(ctx.input.channelId);

    return {
      output: {
        channelId: result._id,
        channelType: result.channel_type,
        name: result.name ?? undefined,
        description: result.description ?? undefined,
        serverId: result.server ?? undefined,
        nsfw: result.nsfw ?? undefined,
        lastMessageId: result.last_message_id ?? undefined
      },
      message: `Fetched ${result.channel_type} channel${result.name ? ` **${result.name}**` : ''} (\`${result._id}\`)`
    };
  })
  .build();

export let editChannel = SlateTool.create(spec, {
  name: 'Edit Channel',
  key: 'edit_channel',
  description: `Edit a Revolt channel's settings. Can update name, description, NSFW status, and archive status. Only fields provided will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to edit'),
      name: z.string().optional().describe('New channel name'),
      description: z.string().optional().describe('New channel description'),
      iconId: z.string().optional().describe('Uploaded file ID for new channel icon'),
      nsfw: z.boolean().optional().describe('Whether the channel is NSFW'),
      archived: z.boolean().optional().describe('Whether to archive the channel'),
      removeFields: z
        .array(z.enum(['Icon', 'Description']))
        .optional()
        .describe('Fields to remove/clear')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the updated channel'),
      name: z.string().optional().describe('Updated channel name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.editChannel(ctx.input.channelId, {
      name: ctx.input.name,
      description: ctx.input.description,
      icon: ctx.input.iconId,
      nsfw: ctx.input.nsfw,
      archived: ctx.input.archived,
      remove: ctx.input.removeFields
    });

    return {
      output: {
        channelId: result._id,
        name: result.name ?? undefined
      },
      message: `Updated channel${result.name ? ` **${result.name}**` : ''} (\`${result._id}\`)`
    };
  })
  .build();

export let deleteChannel = SlateTool.create(spec, {
  name: 'Delete / Leave Channel',
  key: 'delete_channel',
  description: `Delete a server channel or leave a group DM / direct message channel.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to delete or leave'),
      leaveSilently: z.boolean().optional().describe('Leave without notification')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteChannel(ctx.input.channelId, ctx.input.leaveSilently);

    return {
      output: { success: true },
      message: `Deleted or left channel \`${ctx.input.channelId}\``
    };
  })
  .build();
