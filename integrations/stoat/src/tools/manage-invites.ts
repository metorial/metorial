import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createInvite = SlateTool.create(spec, {
  name: 'Create Invite',
  key: 'create_invite',
  description: `Create an invite link for a Revolt channel. The invite allows others to join the server or group.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to create an invite for')
    })
  )
  .output(
    z.object({
      inviteCode: z.string().describe('The invite code'),
      channelId: z.string().describe('ID of the channel'),
      serverId: z.string().optional().describe('ID of the server (if server invite)'),
      creatorId: z.string().describe('ID of the user who created the invite')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createInvite(ctx.input.channelId);

    return {
      output: {
        inviteCode: result._id ?? result.code,
        channelId: result.channel ?? ctx.input.channelId,
        serverId: result.server ?? undefined,
        creatorId: result.creator
      },
      message: `Created invite \`${result._id ?? result.code}\` for channel \`${ctx.input.channelId}\``
    };
  })
  .build();

export let fetchInvite = SlateTool.create(spec, {
  name: 'Fetch Invite',
  key: 'fetch_invite',
  description: `Fetch details about a Revolt invite by its code. Returns information about the server and channel the invite leads to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inviteCode: z.string().describe('The invite code to look up')
    })
  )
  .output(
    z.object({
      inviteCode: z.string().describe('The invite code'),
      serverName: z.string().optional().describe('Name of the server'),
      serverId: z.string().optional().describe('ID of the server'),
      channelName: z.string().optional().describe('Name of the channel'),
      channelId: z.string().optional().describe('ID of the channel'),
      memberCount: z.number().optional().describe('Number of members in the server')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchInvite(ctx.input.inviteCode);

    return {
      output: {
        inviteCode: ctx.input.inviteCode,
        serverName: result.server_name ?? undefined,
        serverId: result.server_id ?? undefined,
        channelName: result.channel_name ?? undefined,
        channelId: result.channel_id ?? undefined,
        memberCount: result.member_count ?? undefined
      },
      message: `Fetched invite \`${ctx.input.inviteCode}\`${result.server_name ? ` for server **${result.server_name}**` : ''}`
    };
  })
  .build();

export let deleteInvite = SlateTool.create(spec, {
  name: 'Delete Invite',
  key: 'delete_invite',
  description: `Delete a Revolt invite by its code. The invite will no longer be usable.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      inviteCode: z.string().describe('The invite code to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteInvite(ctx.input.inviteCode);

    return {
      output: { success: true },
      message: `Deleted invite \`${ctx.input.inviteCode}\``
    };
  })
  .build();

export let fetchServerInvites = SlateTool.create(spec, {
  name: 'Fetch Server Invites',
  key: 'fetch_server_invites',
  description: `List all active invites for a Revolt server.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server')
    })
  )
  .output(
    z.object({
      invites: z
        .array(
          z.object({
            inviteCode: z.string().describe('The invite code'),
            channelId: z.string().describe('ID of the channel'),
            creatorId: z.string().describe('ID of the invite creator')
          })
        )
        .describe('List of active invites')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchServerInvites(ctx.input.serverId);
    let invitesArray = Array.isArray(result) ? result : [];

    let invites = invitesArray.map((i: any) => ({
      inviteCode: i._id ?? i.code,
      channelId: i.channel,
      creatorId: i.creator
    }));

    return {
      output: { invites },
      message: `Found ${invites.length} invite(s) for server \`${ctx.input.serverId}\``
    };
  })
  .build();
