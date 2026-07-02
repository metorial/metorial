import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let memberSchema = z.object({
  serverId: z.string().describe('ID of the server'),
  userId: z.string().describe('User ID of the member'),
  nickname: z.string().optional().describe('Member nickname in the server'),
  roles: z.array(z.string()).describe('Role IDs assigned to the member'),
  joinedAt: z.string().describe('ISO 8601 timestamp when the member joined'),
  timeout: z.string().optional().describe('ISO 8601 timestamp when the timeout expires')
});

export let fetchMembers = SlateTool.create(spec, {
  name: 'Fetch Server Members',
  key: 'fetch_members',
  description: `Fetch members of a Revolt server. Can fetch all members or a specific member by user ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      userId: z.string().optional().describe('Fetch a specific member by user ID'),
      excludeOffline: z.boolean().optional().describe('Exclude offline members from the list')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of server members')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.userId) {
      let result = await client.fetchMember(ctx.input.serverId, ctx.input.userId);
      let member = result.member ?? result;
      return {
        output: {
          members: [
            {
              serverId: member._id?.server ?? ctx.input.serverId,
              userId: member._id?.user ?? ctx.input.userId,
              nickname: member.nickname ?? undefined,
              roles: member.roles ?? [],
              joinedAt: member.joined_at,
              timeout: member.timeout ?? undefined
            }
          ]
        },
        message: `Fetched member \`${ctx.input.userId}\` from server \`${ctx.input.serverId}\``
      };
    }

    let result = await client.fetchMembers(ctx.input.serverId, ctx.input.excludeOffline);
    let membersArray = result.members ?? result;

    let members = membersArray.map((m: any) => ({
      serverId: m._id?.server ?? ctx.input.serverId,
      userId: m._id?.user,
      nickname: m.nickname ?? undefined,
      roles: m.roles ?? [],
      joinedAt: m.joined_at,
      timeout: m.timeout ?? undefined
    }));

    return {
      output: { members },
      message: `Fetched ${members.length} member(s) from server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let editMember = SlateTool.create(spec, {
  name: 'Edit Server Member',
  key: 'edit_member',
  description: `Edit a server member's properties including nickname, roles, avatar, and timeout. Use this to assign roles, set nicknames, or timeout members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      userId: z.string().describe('User ID of the member to edit'),
      nickname: z.string().optional().describe('New nickname for the member'),
      avatarId: z.string().optional().describe('Uploaded file ID for member avatar'),
      roles: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign (replaces all current roles)'),
      timeout: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for timeout expiration (set to past to clear)'),
      removeFields: z
        .array(z.enum(['Nickname', 'Avatar', 'Roles', 'Timeout']))
        .optional()
        .describe('Fields to remove/clear')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('ID of the server'),
      userId: z.string().describe('User ID of the edited member'),
      nickname: z.string().optional().describe('Updated nickname'),
      roles: z.array(z.string()).describe('Updated role IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.editMember(ctx.input.serverId, ctx.input.userId, {
      nickname: ctx.input.nickname,
      avatar: ctx.input.avatarId,
      roles: ctx.input.roles,
      timeout: ctx.input.timeout,
      remove: ctx.input.removeFields
    });

    return {
      output: {
        serverId: result._id?.server ?? ctx.input.serverId,
        userId: result._id?.user ?? ctx.input.userId,
        nickname: result.nickname ?? undefined,
        roles: result.roles ?? []
      },
      message: `Updated member \`${ctx.input.userId}\` in server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let kickMember = SlateTool.create(spec, {
  name: 'Kick Member',
  key: 'kick_member',
  description: `Kick a member from a Revolt server. The member can rejoin if they have an invite.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      userId: z.string().describe('User ID of the member to kick')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the kick was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.kickMember(ctx.input.serverId, ctx.input.userId);

    return {
      output: { success: true },
      message: `Kicked member \`${ctx.input.userId}\` from server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let manageBan = SlateTool.create(spec, {
  name: 'Ban / Unban Member',
  key: 'manage_ban',
  description: `Ban or unban a user from a Revolt server. Banning prevents the user from rejoining. Can also list all bans for a server.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server'),
      action: z.enum(['ban', 'unban', 'list']).describe('Action to perform'),
      userId: z
        .string()
        .optional()
        .describe('User ID to ban or unban (required for ban/unban)'),
      reason: z.string().optional().describe('Reason for the ban (only for ban action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      bans: z
        .array(
          z.object({
            userId: z.string().describe('Banned user ID'),
            reason: z.string().optional().describe('Ban reason')
          })
        )
        .optional()
        .describe('List of bans (only for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let result = await client.fetchBans(ctx.input.serverId);
      let bansArray = result.bans ?? result;
      let bans = bansArray.map((b: any) => ({
        userId: b._id?.user ?? b.user?._id ?? b.id,
        reason: b.reason ?? undefined
      }));
      return {
        output: { success: true, bans },
        message: `Found ${bans.length} ban(s) in server \`${ctx.input.serverId}\``
      };
    }

    if (!ctx.input.userId) throw new Error('userId is required for ban/unban actions');

    if (ctx.input.action === 'ban') {
      await client.banMember(ctx.input.serverId, ctx.input.userId, ctx.input.reason);
    } else {
      await client.unbanMember(ctx.input.serverId, ctx.input.userId);
    }

    return {
      output: { success: true },
      message: `${ctx.input.action === 'ban' ? 'Banned' : 'Unbanned'} user \`${ctx.input.userId}\` in server \`${ctx.input.serverId}\``
    };
  })
  .build();
