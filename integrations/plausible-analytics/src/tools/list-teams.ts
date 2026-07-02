import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List teams associated with your Plausible Analytics account and check whether API access is available for each team. Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of teams to return'),
      after: z.string().optional().describe('Pagination cursor for next page'),
      before: z.string().optional().describe('Pagination cursor for previous page')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('ID of the team'),
            name: z.string().describe('Name of the team'),
            apiAvailable: z.boolean().describe('Whether API access is available for this team')
          })
        )
        .describe('List of teams'),
      meta: z.record(z.string(), z.any()).optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listTeams({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let teams = (result.teams ?? result ?? []).map((t: any) => ({
      teamId: String(t.id ?? t.team_id),
      name: t.name,
      apiAvailable: t.api_available ?? false
    }));

    return {
      output: {
        teams,
        meta: result.meta
      },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
