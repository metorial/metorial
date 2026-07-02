import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, retrieve, delete teams, or manage team membership. Also supports listing all teams, viewing team members and admins, adding or removing members.`,
  instructions: [
    'When removing a team member, a replacement username must be provided.',
    'Use action "list_members" or "list_admins" to view team composition.'
  ],
  tags: {
    destructive: false,
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
          'list_admins',
          'add_member',
          'remove_member'
        ])
        .describe('Action to perform'),
      teamSlug: z
        .string()
        .optional()
        .describe('Team slug (required for all actions except list and create)'),
      name: z.string().optional().describe('Team name (required for create and update)'),
      username: z.string().optional().describe('Username to add or remove from the team'),
      replacementUsername: z
        .string()
        .optional()
        .describe('Replacement user when removing a member (required for remove_member)')
    })
  )
  .output(
    z.object({
      teams: z.array(z.any()).optional().describe('List of teams'),
      team: z.any().optional().describe('Team details'),
      members: z.array(z.any()).optional().describe('Team members'),
      admins: z.array(z.any()).optional().describe('Team admins')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listTeams();
        return {
          output: { teams: data ?? [] },
          message: `Found **${(data ?? []).length}** team(s).`
        };
      }

      case 'get': {
        let team = await client.getTeam(ctx.input.teamSlug ?? '');
        return {
          output: { team },
          message: `Retrieved team **${ctx.input.teamSlug}**.`
        };
      }

      case 'create': {
        let team = await client.createTeam({ name: ctx.input.name ?? '' });
        return {
          output: { team },
          message: `Created team **${ctx.input.name}**.`
        };
      }

      case 'update': {
        let team = await client.updateTeam(ctx.input.teamSlug ?? '', {
          name: ctx.input.name ?? ''
        });
        return {
          output: { team },
          message: `Updated team **${ctx.input.teamSlug}** to name **${ctx.input.name}**.`
        };
      }

      case 'delete': {
        await client.deleteTeam(ctx.input.teamSlug ?? '');
        return {
          output: {},
          message: `Deleted team **${ctx.input.teamSlug}**.`
        };
      }

      case 'list_members': {
        let data = await client.getTeamMembers(ctx.input.teamSlug ?? '');
        let members = data?.members ?? [];
        return {
          output: { members },
          message: `Team **${ctx.input.teamSlug}** has **${members.length}** member(s).`
        };
      }

      case 'list_admins': {
        let data = await client.getTeamAdmins(ctx.input.teamSlug ?? '');
        let admins = data?.admins ?? [];
        return {
          output: { admins },
          message: `Team **${ctx.input.teamSlug}** has **${admins.length}** admin(s).`
        };
      }

      case 'add_member': {
        await client.addTeamMember(ctx.input.teamSlug ?? '', ctx.input.username ?? '');
        return {
          output: {},
          message: `Added **${ctx.input.username}** to team **${ctx.input.teamSlug}**.`
        };
      }

      case 'remove_member': {
        await client.removeTeamMember(
          ctx.input.teamSlug ?? '',
          ctx.input.username ?? '',
          ctx.input.replacementUsername ?? ''
        );
        return {
          output: {},
          message: `Removed **${ctx.input.username}** from team **${ctx.input.teamSlug}**, replaced by **${ctx.input.replacementUsername}**.`
        };
      }
    }
  })
  .build();
