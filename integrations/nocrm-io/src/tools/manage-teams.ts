import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeams = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List, create, update, or delete teams. Also supports adding or removing team members. Use the "action" field to specify the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'add_member', 'remove_member'])
        .describe('Operation to perform'),
      teamId: z
        .number()
        .optional()
        .describe('Team ID (required for get, update, delete, add_member, remove_member)'),
      name: z
        .string()
        .optional()
        .describe('Team name (required for create, optional for update)'),
      userId: z
        .number()
        .optional()
        .describe('User ID to add or remove (for add_member/remove_member)')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.number().describe('Team ID'),
            name: z.string().describe('Team name'),
            memberCount: z.number().optional().describe('Number of members')
          })
        )
        .optional()
        .describe('List of teams'),
      team: z
        .object({
          teamId: z.number().describe('Team ID'),
          name: z.string().describe('Team name'),
          members: z.array(z.any()).optional().describe('Team members')
        })
        .optional()
        .describe('Single team details'),
      deleted: z.boolean().optional().describe('Whether the team was deleted'),
      memberUpdated: z.boolean().optional().describe('Whether the member was added/removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let mapTeam = (t: any) => ({
      teamId: t.id,
      name: t.name,
      members: t.users || t.members,
      memberCount: t.users?.length || t.members?.length
    });

    if (ctx.input.action === 'list') {
      let teams = await client.listTeams();
      return {
        output: {
          teams: teams.map((t: any) => ({
            teamId: t.id,
            name: t.name,
            memberCount: t.users?.length || t.members?.length
          }))
        },
        message: `Found **${teams.length}** teams.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.teamId) throw new Error('teamId is required for get action');
      let team = await client.getTeam(ctx.input.teamId);
      return {
        output: { team: mapTeam(team) },
        message: `Retrieved team **"${team.name}"** (ID: ${team.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let team = await client.createTeam(ctx.input.name);
      return {
        output: { team: mapTeam(team) },
        message: `Created team **"${team.name}"** (ID: ${team.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.teamId) throw new Error('teamId is required for update action');
      if (!ctx.input.name) throw new Error('name is required for update action');
      let team = await client.updateTeam(ctx.input.teamId, ctx.input.name);
      return {
        output: { team: mapTeam(team) },
        message: `Updated team **"${team.name}"** (ID: ${team.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId) throw new Error('teamId is required for delete action');
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { deleted: true },
        message: `Deleted team ${ctx.input.teamId}.`
      };
    }

    if (ctx.input.action === 'add_member') {
      if (!ctx.input.teamId) throw new Error('teamId is required for add_member action');
      if (!ctx.input.userId) throw new Error('userId is required for add_member action');
      await client.addTeamMember(ctx.input.teamId, ctx.input.userId);
      return {
        output: { memberUpdated: true },
        message: `Added user ${ctx.input.userId} to team ${ctx.input.teamId}.`
      };
    }

    if (ctx.input.action === 'remove_member') {
      if (!ctx.input.teamId) throw new Error('teamId is required for remove_member action');
      if (!ctx.input.userId) throw new Error('userId is required for remove_member action');
      await client.removeTeamMember(ctx.input.teamId, ctx.input.userId);
      return {
        output: { memberUpdated: true },
        message: `Removed user ${ctx.input.userId} from team ${ctx.input.teamId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
