import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createServer = SlateTool.create(spec, {
  name: 'Create Server',
  key: 'create_server',
  description: `Create a new Revolt server with a name and optional description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new server'),
      description: z.string().optional().describe('Description for the server'),
      nsfw: z.boolean().optional().describe('Whether the server is NSFW')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('ID of the created server'),
      name: z.string().describe('Name of the created server'),
      channels: z.array(z.string()).describe('IDs of default channels created with the server')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createServer({
      name: ctx.input.name,
      description: ctx.input.description,
      nsfw: ctx.input.nsfw
    });

    let server = result.server ?? result;

    return {
      output: {
        serverId: server._id,
        name: server.name,
        channels: result.channels ?? server.channels ?? []
      },
      message: `Created server **${ctx.input.name}**`
    };
  })
  .build();

export let fetchServer = SlateTool.create(spec, {
  name: 'Fetch Server',
  key: 'fetch_server',
  description: `Fetch details about a Revolt server including its name, description, channels, roles, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server to fetch'),
      includeChannels: z
        .boolean()
        .optional()
        .describe('Include full channel objects in the response')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('ID of the server'),
      ownerId: z.string().describe('ID of the server owner'),
      name: z.string().describe('Server name'),
      description: z.string().optional().describe('Server description'),
      channelIds: z.array(z.string()).describe('IDs of channels in the server'),
      nsfw: z.boolean().describe('Whether the server is NSFW'),
      discoverable: z.boolean().describe('Whether the server is discoverable')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchServer(ctx.input.serverId, ctx.input.includeChannels);
    let server = result.server ?? result;

    return {
      output: {
        serverId: server._id,
        ownerId: server.owner,
        name: server.name,
        description: server.description ?? undefined,
        channelIds: server.channels ?? [],
        nsfw: server.nsfw ?? false,
        discoverable: server.discoverable ?? false
      },
      message: `Fetched server **${server.name}** (\`${server._id}\`)`
    };
  })
  .build();

export let editServer = SlateTool.create(spec, {
  name: 'Edit Server',
  key: 'edit_server',
  description: `Edit a Revolt server's settings including name, description, icon, banner, discoverability, and analytics. Only fields provided will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server to edit'),
      name: z.string().optional().describe('New server name'),
      description: z.string().optional().describe('New server description'),
      iconId: z.string().optional().describe('Uploaded file ID for the new server icon'),
      bannerId: z.string().optional().describe('Uploaded file ID for the new server banner'),
      discoverable: z
        .boolean()
        .optional()
        .describe('Whether the server should be discoverable'),
      analytics: z.boolean().optional().describe('Whether to enable analytics'),
      removeFields: z
        .array(z.enum(['Icon', 'Banner', 'Description']))
        .optional()
        .describe('Fields to remove/clear from the server')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('ID of the updated server'),
      name: z.string().describe('Updated server name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.editServer(ctx.input.serverId, {
      name: ctx.input.name,
      description: ctx.input.description,
      icon: ctx.input.iconId,
      banner: ctx.input.bannerId,
      discoverable: ctx.input.discoverable,
      analytics: ctx.input.analytics,
      remove: ctx.input.removeFields
    });

    return {
      output: {
        serverId: result._id,
        name: result.name
      },
      message: `Updated server **${result.name}** (\`${result._id}\`)`
    };
  })
  .build();

export let deleteServer = SlateTool.create(spec, {
  name: 'Delete / Leave Server',
  key: 'delete_server',
  description: `Delete a server you own or leave a server you're a member of. If you are the owner, the server is permanently deleted. If you are a member, you leave the server.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server to delete or leave'),
      leaveSilently: z
        .boolean()
        .optional()
        .describe('Leave without sending a notification to other members')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteServer(ctx.input.serverId, ctx.input.leaveSilently);

    return {
      output: { success: true },
      message: `Deleted or left server \`${ctx.input.serverId}\``
    };
  })
  .build();
