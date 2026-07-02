import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let inviteSchema = z.object({
  inviteCode: z.string().describe('The invite code'),
  channelId: z.string().nullable().describe('Channel the invite is for'),
  guildId: z.string().nullable().describe('Guild the invite belongs to'),
  inviterUsername: z.string().nullable().describe('Username of the invite creator'),
  maxAge: z
    .number()
    .nullable()
    .describe('Duration (in seconds) after which the invite expires, or 0 for never'),
  maxUses: z
    .number()
    .nullable()
    .describe('Max number of times the invite can be used, or 0 for unlimited'),
  uses: z.number().nullable().describe('Number of times the invite has been used'),
  temporary: z.boolean().nullable().describe('Whether the invite grants temporary membership'),
  expiresAt: z.string().nullable().describe('ISO8601 timestamp when the invite expires'),
  inviteUrl: z.string().describe('Full invite URL')
});

let mapInvite = (invite: any) => ({
  inviteCode: invite.code,
  channelId: invite.channel?.id ?? null,
  guildId: invite.guild?.id ?? null,
  inviterUsername: invite.inviter?.username ?? null,
  maxAge: invite.max_age ?? null,
  maxUses: invite.max_uses ?? null,
  uses: invite.uses ?? null,
  temporary: invite.temporary ?? null,
  expiresAt: invite.expires_at ?? null,
  inviteUrl: `https://discord.gg/${invite.code}`
});

export let manageInvites = SlateTool.create(spec, {
  name: 'Manage Invites',
  key: 'manage_invites',
  description: `List, create, or delete Discord invites. Invites allow users to join a guild via a shareable link. You can list invites for a specific channel or an entire guild, create new invites for a channel, or delete existing invites by code.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageInvites)
  .input(
    z.object({
      action: z
        .enum(['list_channel', 'list_guild', 'create', 'delete'])
        .describe('Invite action to perform'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID (required for list_channel and create actions)'),
      guildId: z.string().optional().describe('Guild ID (required for list_guild action)'),
      inviteCode: z
        .string()
        .optional()
        .describe('Invite code to delete (required for delete action)'),
      maxAge: z
        .number()
        .optional()
        .describe(
          'Duration (in seconds) before the invite expires, or 0 for never (default: 86400 / 24 hours)'
        ),
      maxUses: z
        .number()
        .optional()
        .describe(
          'Max number of times the invite can be used, or 0 for unlimited (default: 0)'
        ),
      temporary: z
        .boolean()
        .optional()
        .describe('Whether the invite grants temporary membership (default: false)'),
      unique: z
        .boolean()
        .optional()
        .describe('Whether to create a unique one-time invite (default: false)')
    })
  )
  .output(
    z.object({
      invite: inviteSchema
        .optional()
        .describe('Created or deleted invite (for create/delete actions)'),
      invites: z
        .array(inviteSchema)
        .optional()
        .describe('List of invites (for list_channel/list_guild actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action } = ctx.input;

    if (action === 'list_channel') {
      if (!ctx.input.channelId)
        throw discordServiceError('channelId is required for list_channel action');
      let invites = await client.getChannelInvites(ctx.input.channelId);
      let mapped = invites.map(mapInvite);
      return {
        output: { invites: mapped },
        message: `Found ${mapped.length} invite(s) for channel \`${ctx.input.channelId}\`.`
      };
    }

    if (action === 'list_guild') {
      if (!ctx.input.guildId)
        throw discordServiceError('guildId is required for list_guild action');
      let invites = await client.getGuildInvites(ctx.input.guildId);
      let mapped = invites.map(mapInvite);
      return {
        output: { invites: mapped },
        message: `Found ${mapped.length} invite(s) for guild \`${ctx.input.guildId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.channelId)
        throw discordServiceError('channelId is required for create action');
      let invite = await client.createChannelInvite(ctx.input.channelId, {
        max_age: ctx.input.maxAge,
        max_uses: ctx.input.maxUses,
        temporary: ctx.input.temporary,
        unique: ctx.input.unique
      });
      let mapped = mapInvite(invite);
      return {
        output: { invite: mapped },
        message: `Created invite \`${mapped.inviteCode}\` for channel \`${ctx.input.channelId}\`: ${mapped.inviteUrl}`
      };
    }

    // delete
    if (!ctx.input.inviteCode)
      throw discordServiceError('inviteCode is required for delete action');
    let invite = await client.deleteInvite(ctx.input.inviteCode);
    let mapped = mapInvite(invite);
    return {
      output: { invite: mapped },
      message: `Deleted invite \`${ctx.input.inviteCode}\`.`
    };
  })
  .build();
