import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.number().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
  createdAt: z.string().optional().describe('When the team was created'),
  owner: z.any().optional().describe('Team owner details'),
  members: z.array(z.any()).optional().describe('Team members'),
  projects: z.array(z.any()).optional().describe('Team projects')
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
  description: `List, create, update, or delete teams. Also supports listing team members, removing members, and sending invitations to join a team.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_members',
          'remove_member',
          'invite'
        ])
        .describe('Action to perform'),
      teamId: z
        .string()
        .optional()
        .describe('Team ID (required for most actions except list and create)'),
      accountId: z.string().optional().describe('Account ID (for list filter or create)'),
      name: z
        .string()
        .optional()
        .describe('Team name (required for create, optional for update)'),
      memberId: z.string().optional().describe('Member ID (for remove_member action)'),
      inviteEmail: z.string().optional().describe('Email to invite (for invite action)'),
      inviteAdmin: z.boolean().optional().describe('Grant admin privileges to invitee'),
      inviteMessage: z.string().optional().describe('Custom message for the invitation')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).optional().describe('List of teams'),
      team: teamSchema.optional().describe('Team details'),
      members: z.array(memberSchema).optional().describe('Team members'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
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

    let mapTeam = (t: any) => ({
      teamId: t.id,
      name: t.name,
      createdAt: t.created_at,
      owner: t.owner,
      members: t.members,
      projects: t.projects
    });

    let mapMember = (m: any) => ({
      memberId: m.id,
      name: m.name,
      email: m.email,
      admin: m.admin,
      createdAt: m.created_at
    });

    switch (action) {
      case 'list': {
        let data = await client.listTeams({ accountId });
        let teams = (data.results || []).map(mapTeam);
        return {
          output: { teams, success: true },
          message: `Found **${teams.length}** team(s).`
        };
      }

      case 'get': {
        if (!teamId) throw new Error('teamId is required for get action');
        let team = await client.getTeam(teamId);
        return {
          output: { team: mapTeam(team), success: true },
          message: `Team **${team.name}**.`
        };
      }

      case 'create': {
        if (!accountId || !name)
          throw new Error('accountId and name are required for create action');
        let created = await client.createTeam(accountId, name);
        return {
          output: { team: mapTeam(created), success: true },
          message: `Created team **${created.name}**.`
        };
      }

      case 'update': {
        if (!teamId || !name)
          throw new Error('teamId and name are required for update action');
        await client.updateTeam(teamId, name);
        return {
          output: { success: true },
          message: `Updated team **${teamId}**.`
        };
      }

      case 'delete': {
        if (!teamId) throw new Error('teamId is required for delete action');
        await client.deleteTeam(teamId);
        return {
          output: { success: true },
          message: `Deleted team **${teamId}**.`
        };
      }

      case 'list_members': {
        if (!teamId) throw new Error('teamId is required for list_members action');
        let data = await client.listTeamMembers(teamId);
        let members = (data.results || []).map(mapMember);
        return {
          output: { members, success: true },
          message: `Found **${members.length}** member(s).`
        };
      }

      case 'remove_member': {
        if (!teamId || !memberId)
          throw new Error('teamId and memberId are required for remove_member action');
        await client.removeTeamMember(teamId, memberId);
        return {
          output: { success: true },
          message: `Removed member **${memberId}** from team ${teamId}.`
        };
      }

      case 'invite': {
        if (!teamId || !inviteEmail)
          throw new Error('teamId and inviteEmail are required for invite action');
        await client.createTeamInvitation(teamId, {
          email: inviteEmail,
          admin: inviteAdmin,
          message: inviteMessage
        });
        return {
          output: { success: true },
          message: `Invited **${inviteEmail}** to team ${teamId}.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
