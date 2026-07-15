import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageMembers = SlateTool.create(spec, {
  name: 'Manage Members',
  key: 'manage_members',
  description: `List, add, or remove members from a Microsoft Team or a specific channel. Supports adding members as owners or regular members.`,
  instructions: [
    'To list members, set action to "list".',
    'To add a member, provide userId and set action to "add". Optionally set role to "owner".',
    'To remove a member, provide membershipId and set action to "remove".',
    'Set channelId to manage channel-level membership instead of team-level.'
  ]
})
  .scopes(microsoftTeamsActionScopes.manageMembers)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      channelId: z
        .string()
        .optional()
        .describe('ID of the channel (for channel-level membership)'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      userId: z.string().optional().describe('User ID to add as a member (for add action)'),
      role: z.enum(['member', 'owner']).default('member').describe('Role for the new member'),
      membershipId: z
        .string()
        .optional()
        .describe('Membership ID of the member to remove (for remove action)')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            membershipId: z.string().describe('Membership entry ID'),
            displayName: z.string().nullable().describe('Member display name'),
            userId: z.string().nullable().describe('Member user ID'),
            email: z.string().nullable().describe('Member email'),
            roles: z.array(z.string()).describe('Member roles (e.g., owner, member, guest)')
          })
        )
        .optional()
        .describe('List of members (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let members = ctx.input.channelId
        ? await client.listChannelMembers(ctx.input.teamId, ctx.input.channelId)
        : await client.listTeamMembers(ctx.input.teamId);

      let mapped = members.map((m: any) => ({
        membershipId: m.id,
        displayName: m.displayName || null,
        userId: m.userId || null,
        email: m.email || null,
        roles: m.roles || []
      }));

      return {
        output: { members: mapped, success: true },
        message: `Found **${mapped.length}** members.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.userId) throw new Error('userId is required for add action');

      let body: any = {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ctx.input.role === 'owner' ? ['owner'] : [],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${ctx.input.userId}')`
      };

      if (ctx.input.channelId) {
        await client.addChannelMember(ctx.input.teamId, ctx.input.channelId, body);
      } else {
        await client.addTeamMember(ctx.input.teamId, body);
      }

      return {
        output: { success: true },
        message: `Member added successfully with role **${ctx.input.role}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.membershipId)
        throw new Error('membershipId is required for remove action');

      if (ctx.input.channelId) {
        await client.removeChannelMember(
          ctx.input.teamId,
          ctx.input.channelId,
          ctx.input.membershipId
        );
      } else {
        await client.removeTeamMember(ctx.input.teamId, ctx.input.membershipId);
      }

      return {
        output: { success: true },
        message: `Member removed successfully.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
