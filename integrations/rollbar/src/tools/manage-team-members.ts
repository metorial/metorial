import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMembers = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description:
    'List, add, remove or invite team members with an account token. Invitations send email. List team invitations to recover their IDs, then read back or cancel a specific invitation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'remove', 'invite', 'listInvites', 'getInvite', 'cancelInvite'])
        .describe('Operation'),
      teamId: z.number().describe('Team ID from manage_team'),
      userId: z
        .number()
        .optional()
        .describe('User ID from list_users, required for add/remove'),
      email: z.string().optional().describe('Email address for invite'),
      invitationId: z
        .number()
        .optional()
        .describe('ID from invite, required for getInvite/cancelInvite'),
      page: z
        .number()
        .optional()
        .describe('Page number for list/listInvites; up to 5000 results per page')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            userId: z.number(),
            username: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Team members'),
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      invitationId: z.number().optional().describe('Invitation ID'),
      invitations: z
        .array(
          z.object({
            invitationId: z.number(),
            teamId: z.number(),
            email: z.string(),
            status: z.string()
          })
        )
        .optional()
        .describe('Team invitations, including pending and historical states'),
      invitation: z
        .object({
          invitationId: z.number(),
          teamId: z.number(),
          email: z.string(),
          status: z.string()
        })
        .optional()
        .describe('Invitation details')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.action === 'listInvites') {
      const invitations = (
        await client.listTeamInvitations(ctx.input.teamId, ctx.input.page)
      ).result.map(invite => ({
        invitationId: invite.id,
        teamId: invite.team_id,
        email: invite.to_email,
        status: invite.status
      }));
      return {
        output: { invitations },
        message: `Found ${invitations.length} team invitations.`
      };
    }
    if (ctx.input.action === 'list') {
      const members = (
        await client.listTeamMembers(ctx.input.teamId, ctx.input.page)
      ).result.map(user => ({ userId: user.id, username: user.username, email: user.email }));
      return { output: { members }, message: `Found ${members.length} team members.` };
    }
    if (ctx.input.action === 'add' || ctx.input.action === 'remove') {
      if (ctx.input.userId === undefined)
        throw createApiServiceError('userId is required for add/remove.');
      if (ctx.input.action === 'add')
        await client.addUserToTeam(ctx.input.teamId, ctx.input.userId);
      else await client.removeUserFromTeam(ctx.input.teamId, ctx.input.userId);
      return {
        output: { success: true },
        message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} user ${ctx.input.userId} ${ctx.input.action === 'add' ? 'to' : 'from'} team ${ctx.input.teamId}.`
      };
    }
    if (ctx.input.action === 'invite') {
      if (!ctx.input.email) throw createApiServiceError('email is required for invite.');
      const invite = (await client.inviteUserToTeam(ctx.input.teamId, ctx.input.email)).result;
      return {
        output: {
          success: true,
          invitationId: invite.id,
          invitation: {
            invitationId: invite.id,
            teamId: invite.team_id,
            email: invite.to_email,
            status: invite.status
          }
        },
        message: `Sent invitation ${invite.id} to ${invite.to_email}.`
      };
    }
    if (ctx.input.invitationId === undefined)
      throw createApiServiceError('invitationId is required for getInvite/cancelInvite.');
    const invite = (await client.getInvitation(ctx.input.invitationId)).result;
    if (invite.team_id !== ctx.input.teamId)
      throw createApiServiceError(
        'The invitation belongs to another team. Select its actual teamId.'
      );
    if (ctx.input.action === 'cancelInvite') {
      if (!['cancelled', 'canceled'].includes(invite.status))
        await client.cancelInvitation(invite.id);
      return {
        output: { success: true, invitationId: invite.id },
        message: `Cancelled invitation ${invite.id}.`
      };
    }
    return {
      output: {
        invitationId: invite.id,
        invitation: {
          invitationId: invite.id,
          teamId: invite.team_id,
          email: invite.to_email,
          status: invite.status
        }
      },
      message: `Retrieved invitation ${invite.id} (${invite.status}).`
    };
  })
  .build();
