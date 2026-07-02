import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams (workspaces) in Front with their members and inbox assignments.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeams();

    let teams = result._results.map(t => ({
      teamId: t.id,
      name: t.name
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** teams.`
    };
  });

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve detailed information about a specific team including its members.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team')
    })
  )
  .output(
    z.object({
      teamId: z.string(),
      name: z.string(),
      members: z.array(
        z.object({
          teammateId: z.string(),
          email: z.string(),
          firstName: z.string(),
          lastName: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let team = await client.getTeam(ctx.input.teamId);

    return {
      output: {
        teamId: team.id,
        name: team.name,
        members: (team.members || []).map(m => ({
          teammateId: m.id,
          email: m.email,
          firstName: m.first_name,
          lastName: m.last_name
        }))
      },
      message: `Retrieved team **${team.name}** with ${team.members?.length || 0} members.`
    };
  });

export let manageTeamMembers = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description: `Add or remove teammates from a team. Provide teammate IDs to add, remove, or both in a single operation.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      addTeammateIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to add to the team'),
      removeTeammateIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to remove from the team')
    })
  )
  .output(
    z.object({
      teamId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let actions: string[] = [];

    if (ctx.input.addTeammateIds && ctx.input.addTeammateIds.length > 0) {
      await client.addTeammates(ctx.input.teamId, ctx.input.addTeammateIds);
      actions.push(`added ${ctx.input.addTeammateIds.length} teammate(s)`);
    }

    if (ctx.input.removeTeammateIds && ctx.input.removeTeammateIds.length > 0) {
      await client.removeTeammates(ctx.input.teamId, ctx.input.removeTeammateIds);
      actions.push(`removed ${ctx.input.removeTeammateIds.length} teammate(s)`);
    }

    return {
      output: { teamId: ctx.input.teamId, updated: actions.length > 0 },
      message:
        actions.length > 0
          ? `Updated team ${ctx.input.teamId}: ${actions.join(', ')}.`
          : `No changes made to team ${ctx.input.teamId}.`
    };
  });
