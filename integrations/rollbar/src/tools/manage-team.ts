import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, retrieve, list, or delete Rollbar teams. Teams control user access to projects with configurable access levels (Standard, Light, View).
Requires an **account-level** access token.`,
  instructions: [
    'Use action "list" to see all teams.',
    'Use action "get" with a teamId to retrieve a specific team.',
    'Use action "create" with a name and optional accessLevel to create a new team.',
    'Use action "delete" with a teamId to delete a team.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      teamId: z
        .number()
        .optional()
        .describe('Team ID (required for "get" and "delete" actions)'),
      name: z.string().optional().describe('Team name (required for "create" action)'),
      accessLevel: z
        .enum(['standard', 'light', 'view'])
        .optional()
        .describe('Access level for the new team (for "create" action)')
    })
  )
  .output(
    z.object({
      team: z
        .object({
          teamId: z.number().describe('Team ID'),
          name: z.string().describe('Team name'),
          accessLevel: z.string().optional().describe('Access level'),
          accountId: z.number().optional().describe('Account ID')
        })
        .optional()
        .describe('Single team (for get/create)'),
      teams: z
        .array(
          z.object({
            teamId: z.number().describe('Team ID'),
            name: z.string().describe('Team name'),
            accessLevel: z.string().optional().describe('Access level'),
            accountId: z.number().optional().describe('Account ID')
          })
        )
        .optional()
        .describe('List of teams (for list action)'),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapTeam = (t: any) => ({
      teamId: t.id,
      name: t.name,
      accessLevel: t.access_level,
      accountId: t.account_id
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTeams();
      let teams = (result?.result || []).map(mapTeam);
      return {
        output: { teams },
        message: `Found **${teams.length}** teams.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.teamId) throw new Error('teamId is required for "get" action');
      let result = await client.getTeam(ctx.input.teamId);
      let team = mapTeam(result?.result);
      return {
        output: { team },
        message: `Retrieved team **${team.name}** (ID: ${team.teamId}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');
      let result = await client.createTeam({
        name: ctx.input.name,
        access_level: ctx.input.accessLevel
      });
      let team = mapTeam(result?.result);
      return {
        output: { team },
        message: `Created team **${team.name}** (ID: ${team.teamId})${team.accessLevel ? ` with access level "${team.accessLevel}"` : ''}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId) throw new Error('teamId is required for "delete" action');
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { deleted: true },
        message: `Deleted team with ID **${ctx.input.teamId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
