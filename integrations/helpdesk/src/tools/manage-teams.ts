import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  id: z.string().describe('Unique team identifier'),
  name: z.string().describe('Team name'),
  description: z.string().optional().describe('Team description'),
  isDefault: z.boolean().optional().describe('Whether this is the default team'),
  agentIDs: z.array(z.string()).optional().describe('IDs of agents assigned to this team'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the team was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the team was last updated')
});

export let manageTeams = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List, get, create, update, and delete HelpDesk teams. Teams are used to organize agents into groups for ticket routing, assignment, and collaboration. Each team can have its own set of agents, tags, and canned responses.`,
  instructions: [
    'Use "list" to retrieve all teams in the account.',
    'Use "get" with a teamId to retrieve a specific team and its members.',
    'Use "create" with a name to create a new team.',
    'Use "update" with a teamId plus fields to modify an existing team.',
    'Use "delete" with a teamId to remove a team.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform on teams'),
      teamId: z.string().optional().describe('Team ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Team name (required for create, optional for update)'),
      description: z
        .string()
        .optional()
        .describe('Team description (optional for create and update)')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).optional().describe('List of teams (for list action)'),
      team: teamSchema
        .optional()
        .describe('Single team details (for get, create, update actions)'),
      deleted: z.boolean().optional().describe('Whether the team was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let teams = await client.listTeams();
      return {
        output: { teams },
        message: `Found **${teams.length}** team(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.teamId) {
        throw new Error('teamId is required for the "get" action');
      }
      let team = await client.getTeam(ctx.input.teamId);
      return {
        output: { team },
        message: `Retrieved team **${team.name}** (${team.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the "create" action');
      }
      let input: Record<string, unknown> = {
        name: ctx.input.name
      };
      if (ctx.input.description !== undefined) input.description = ctx.input.description;

      let team = await client.createTeam(input as any);
      return {
        output: { team },
        message: `Created team **${team.name}** (${team.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.teamId) {
        throw new Error('teamId is required for the "update" action');
      }
      let input: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.description !== undefined) input.description = ctx.input.description;

      let team = await client.updateTeam(ctx.input.teamId, input as any);
      return {
        output: { team },
        message: `Updated team **${team.name}** (${team.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.teamId) {
        throw new Error('teamId is required for the "delete" action');
      }
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { deleted: true },
        message: `Deleted team **${ctx.input.teamId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
