import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Member, Team } from '../lib/types';
import { accountIdSchema, nextUrlSchema } from '../lib/validation';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.number().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
  createdAt: z.string().optional().describe('When the team was created'),
  owner: z.unknown().optional().describe('Team owner details'),
  members: z.array(z.unknown()).optional().describe('Team members'),
  projects: z.array(z.unknown()).optional().describe('Team projects')
});

let memberSchema = z.object({
  memberId: z.number().describe('Member ID'),
  name: z.string().optional().describe('Member name'),
  email: z.string().optional().describe('Member email'),
  admin: z.boolean().optional().describe('Whether the member is an admin'),
  createdAt: z.string().optional().describe('When the member joined')
});

export let manageTeams = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List, create, update, or delete teams. Also supports listing team members, removing members, and sending invitations to join a team. The invite action sends a real email. Call list_accounts to discover account IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      nextUrl: nextUrlSchema,
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_members',
          'remove_member',
          'invite',
          'list_invitations',
          'delete_invitation'
        ])
        .describe('Action to perform'),
      teamId: z
        .string()
        .optional()
        .describe('Team ID (required for most actions except list and create)'),
      accountId: accountIdSchema.optional(),
      name: z
        .string()
        .optional()
        .describe('Team name (required for create, optional for update)'),
      memberId: z.string().optional().describe('Member ID (for remove_member action)'),
      invitationId: z.string().optional().describe('Invitation ID for delete_invitation'),
      inviteEmail: z.string().optional().describe('Email to invite (for invite action)'),
      inviteAdmin: z.boolean().optional().describe('Grant admin privileges to invitee'),
      inviteMessage: z.string().optional().describe('Custom message for the invitation')
    })
  )
  .output(
    z.object({
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      teams: z.array(teamSchema).optional().describe('List of teams'),
      team: teamSchema.optional().describe('Team details'),
      members: z.array(memberSchema).optional().describe('Team members'),
      invitationId: z.number().optional().describe('Created invitation ID'),
      invitations: z
        .array(
          z.object({
            invitationId: z.number(),
            email: z.string().optional(),
            admin: z.boolean().optional()
          })
        )
        .optional(),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let {
      action,
      teamId,
      accountId,
      name,
      memberId,
      inviteEmail,
      inviteAdmin,
      inviteMessage
    } = ctx.input;

    let mapTeam = (t: Team) => ({
      teamId: t.id ?? undefined,
      name: t.name ?? undefined,
      createdAt: t.created_at ?? undefined,
      owner: t.owner ?? undefined,
      members: t.members ?? undefined,
      projects: t.projects?.map(project => {
        if (!isApiErrorRecord(project)) return project;
        return Object.fromEntries(
          Object.entries(project).filter(
            ([key]) => !['token', 'api_key', 'api_keys'].includes(key)
          )
        );
      })
    });

    let mapMember = (m: Member) => ({
      memberId: m.id ?? undefined,
      name: m.name ?? undefined,
      email: m.email ?? undefined,
      admin: m.admin ?? undefined,
      createdAt: m.created_at ?? undefined
    });

    switch (action) {
      case 'list': {
        let data = await client.listTeams({ accountId, nextUrl: ctx.input.nextUrl });
        let teams = (data.results || []).map(mapTeam);
        return {
          output: { teams, nextUrl: data.links?.next ?? undefined, success: true },
          message: `Found **${teams.length}** team(s).`
        };
      }

      case 'get': {
        if (!teamId) throw createApiServiceError('teamId is required for get action');
        let team = await client.getTeam(teamId);
        return {
          output: { team: mapTeam(team), success: true },
          message: `Team **${team.name}**.`
        };
      }

      case 'create': {
        if (!accountId || !name)
          throw createApiServiceError('accountId and name are required for create action');
        let created = await client.createTeam(accountId, name);
        return {
          output: { team: mapTeam(created), success: true },
          message: `Created team **${created.name}**.`
        };
      }

      case 'update': {
        if (!teamId || !name)
          throw createApiServiceError('teamId and name are required for update action');
        await client.updateTeam(teamId, name);
        return {
          output: { success: true },
          message: `Updated team **${teamId}**.`
        };
      }

      case 'delete': {
        if (!teamId) throw createApiServiceError('teamId is required for delete action');
        await client.deleteTeam(teamId);
        return {
          output: { success: true },
          message: `Deleted team **${teamId}**.`
        };
      }

      case 'list_members': {
        if (!teamId) throw createApiServiceError('teamId is required for list_members action');
        let data = await client.listTeamMembers(teamId, ctx.input.nextUrl);
        let members = (data.results || []).map(mapMember);
        return {
          output: { members, nextUrl: data.links?.next ?? undefined, success: true },
          message: `Found **${members.length}** member(s).`
        };
      }

      case 'remove_member': {
        if (!teamId || !memberId)
          throw createApiServiceError(
            'teamId and memberId are required for remove_member action'
          );
        await client.removeTeamMember(teamId, memberId);
        return {
          output: { success: true },
          message: `Removed member **${memberId}** from team ${teamId}.`
        };
      }

      case 'invite': {
        if (!teamId || !inviteEmail)
          throw createApiServiceError('teamId and inviteEmail are required for invite action');
        const invitation = await client.createTeamInvitation(teamId, {
          email: inviteEmail,
          admin: inviteAdmin,
          message: inviteMessage
        });
        return {
          output: { success: true, invitationId: invitation.id },
          message: `Invited **${inviteEmail}** to team ${teamId}.`
        };
      }

      case 'list_invitations': {
        if (!teamId) throw createApiServiceError('teamId is required for list_invitations.');
        const data = await client.listTeamInvitations(teamId, ctx.input.nextUrl);
        return {
          output: {
            invitations: data.results.map(invitation => ({
              invitationId: invitation.id,
              email: invitation.email ?? undefined,
              admin: invitation.admin ?? undefined
            })),
            nextUrl: data.links?.next ?? undefined,
            success: true
          },
          message: 'Retrieved team invitations.'
        };
      }
      case 'delete_invitation': {
        if (!teamId || !ctx.input.invitationId)
          throw createApiServiceError(
            'teamId and invitationId are required for delete_invitation.'
          );
        await client.deleteTeamInvitation(teamId, ctx.input.invitationId);
        return { output: { success: true }, message: 'Deleted the invitation.' };
      }
      default:
        throw createApiServiceError(`Unknown action: ${action}`);
    }
  })
  .build();
