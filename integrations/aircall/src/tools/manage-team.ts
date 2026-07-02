import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create or delete teams, and add or remove users from teams. Teams are used in call distribution for numbers. Retrieve team details with user membership.`,
  constraints: ['Team names must be unique and max 64 characters.']
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'get', 'list', 'add_user', 'remove_user'])
        .describe('The operation to perform'),
      teamId: z
        .number()
        .optional()
        .describe('Team ID (required for delete, get, add_user, remove_user)'),
      teamName: z
        .string()
        .optional()
        .describe('Team name (required for create, max 64 chars, must be unique)'),
      userId: z
        .number()
        .optional()
        .describe('User ID (required for add_user and remove_user)'),
      page: z.number().optional().describe('Page number for list action (default: 1)'),
      perPage: z.number().optional().describe('Results per page for list action (max: 50)')
    })
  )
  .output(
    z.object({
      teamId: z.number().optional().describe('Team ID'),
      teamName: z.string().optional().describe('Team name'),
      users: z
        .array(
          z.object({
            userId: z.number(),
            name: z.string()
          })
        )
        .optional()
        .describe('Team members'),
      teams: z
        .array(
          z.object({
            teamId: z.number(),
            teamName: z.string(),
            userCount: z.number()
          })
        )
        .optional()
        .describe('List of teams (for list action)'),
      totalCount: z.number().optional().describe('Total teams count (for list action)'),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listTeams({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let teams = result.items.map((t: any) => ({
        teamId: t.id,
        teamName: t.name,
        userCount: (t.users || []).length
      }));
      return {
        output: { teams, totalCount: result.meta.total },
        message: `Found **${result.meta.total}** teams.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.teamId) throw new Error('teamId is required for get action');
      let team = await client.getTeam(ctx.input.teamId);
      return {
        output: {
          teamId: team.id,
          teamName: team.name,
          users: (team.users || []).map((u: any) => ({
            userId: u.id,
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          }))
        },
        message: `Team **${team.name}** has ${(team.users || []).length} members.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.teamName) throw new Error('teamName is required for creating a team');
      let team = await client.createTeam(ctx.input.teamName);
      return {
        output: { teamId: team.id, teamName: team.name, users: [] },
        message: `Created team **${team.name}** (#${team.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.teamId) throw new Error('teamId is required for deleting a team');
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { teamId: ctx.input.teamId, deleted: true },
        message: `Deleted team **#${ctx.input.teamId}**.`
      };
    }

    if (action === 'add_user') {
      if (!ctx.input.teamId || !ctx.input.userId)
        throw new Error('teamId and userId are required for add_user');
      let team = await client.addUserToTeam(ctx.input.teamId, ctx.input.userId);
      return {
        output: {
          teamId: team.id,
          teamName: team.name,
          users: (team.users || []).map((u: any) => ({
            userId: u.id,
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          }))
        },
        message: `Added user #${ctx.input.userId} to team **${team.name}**.`
      };
    }

    if (action === 'remove_user') {
      if (!ctx.input.teamId || !ctx.input.userId)
        throw new Error('teamId and userId are required for remove_user');
      let team = await client.removeUserFromTeam(ctx.input.teamId, ctx.input.userId);
      return {
        output: {
          teamId: team.id,
          teamName: team.name,
          users: (team.users || []).map((u: any) => ({
            userId: u.id,
            name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim()
          }))
        },
        message: `Removed user #${ctx.input.userId} from team **${team.name}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
