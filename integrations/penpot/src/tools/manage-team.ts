import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamTool = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, rename, or delete a team. Also retrieve team details, members, invitations, and statistics. Use **action** to specify the operation.`,
  instructions: [
    'To create a team, set action to "create" and provide a name.',
    'To rename, set action to "rename" with teamId and name.',
    'To delete, set action to "delete" with teamId.',
    'To get details, set action to "get" with teamId.',
    'To list members, set action to "get_members" with teamId.',
    'To invite members, set action to "invite" with teamId and invitations array.',
    'To update a member role, set action to "update_role" with teamId, memberId, and role.',
    'To remove a member, set action to "remove_member" with teamId and memberId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'rename',
          'delete',
          'get',
          'get_members',
          'invite',
          'update_role',
          'remove_member'
        ])
        .describe('The operation to perform'),
      teamId: z
        .string()
        .optional()
        .describe('ID of the team (required for all actions except "create")'),
      name: z.string().optional().describe('Team name (required for "create" and "rename")'),
      invitations: z
        .array(
          z.object({
            email: z.string().describe('Email address to invite'),
            role: z.enum(['owner', 'admin', 'editor', 'viewer']).describe('Role to assign')
          })
        )
        .optional()
        .describe('Invitations to send (for "invite" action)'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID (for "update_role" and "remove_member" actions)'),
      role: z
        .enum(['owner', 'admin', 'editor', 'viewer'])
        .optional()
        .describe('New role (for "update_role" action)')
    })
  )
  .output(
    z.object({
      team: z.any().optional().describe('Team data (for create, rename, get actions)'),
      members: z.array(z.any()).optional().describe('Team members (for get_members action)'),
      invitationResult: z.any().optional().describe('Invitation result (for invite action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, teamId, name, invitations, memberId, role } = ctx.input;

    switch (action) {
      case 'create': {
        if (!name) throw new Error('name is required for create action');
        let team = await client.createTeam(name);
        return {
          output: { team },
          message: `Created team **${name}**.`
        };
      }
      case 'rename': {
        if (!teamId || !name)
          throw new Error('teamId and name are required for rename action');
        let team = await client.updateTeam(teamId, name);
        return {
          output: { team },
          message: `Renamed team to **${name}**.`
        };
      }
      case 'delete': {
        if (!teamId) throw new Error('teamId is required for delete action');
        await client.deleteTeam(teamId);
        return {
          output: {},
          message: `Deleted team \`${teamId}\`.`
        };
      }
      case 'get': {
        if (!teamId) throw new Error('teamId is required for get action');
        let team = await client.getTeam({ id: teamId });
        return {
          output: { team },
          message: `Retrieved team **${team.name}**.`
        };
      }
      case 'get_members': {
        if (!teamId) throw new Error('teamId is required for get_members action');
        let members = await client.getTeamMembers(teamId);
        return {
          output: { members },
          message: `Found **${members.length}** member(s) in the team.`
        };
      }
      case 'invite': {
        if (!teamId || !invitations?.length)
          throw new Error('teamId and invitations are required for invite action');
        let result = await client.createTeamInvitations(teamId, invitations);
        return {
          output: { invitationResult: result },
          message: `Sent **${invitations.length}** invitation(s).`
        };
      }
      case 'update_role': {
        if (!teamId || !memberId || !role)
          throw new Error('teamId, memberId, and role are required for update_role action');
        await client.updateTeamMemberRole(teamId, memberId, role);
        return {
          output: {},
          message: `Updated member role to **${role}**.`
        };
      }
      case 'remove_member': {
        if (!teamId || !memberId)
          throw new Error('teamId and memberId are required for remove_member action');
        await client.deleteTeamMember(teamId, memberId);
        return {
          output: {},
          message: `Removed member \`${memberId}\` from the team.`
        };
      }
    }
  })
  .build();
