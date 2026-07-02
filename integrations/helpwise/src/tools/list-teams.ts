import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams in your Helpwise account. Optionally get details for a specific team by providing a team ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('Specific team ID to retrieve details for (omit to list all teams)')
    })
  )
  .output(
    z.object({
      teams: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of teams (when listing all)'),
      team: z
        .record(z.string(), z.any())
        .optional()
        .describe('Team details (when fetching specific team)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.teamId) {
      let team = await client.getTeam(ctx.input.teamId);
      return {
        output: { team },
        message: `Retrieved team **${ctx.input.teamId}**.`
      };
    }

    let result = await client.listTeams();
    let teams = Array.isArray(result) ? result : (result.teams ?? result.data ?? []);

    return {
      output: { teams },
      message: `Retrieved ${teams.length} team(s).`
    };
  })
  .build();
