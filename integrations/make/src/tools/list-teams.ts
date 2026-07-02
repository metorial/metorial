import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams belonging to an organization. Teams are the primary container for scenarios, connections, and other Make resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.number().describe('Organization ID to list teams for'),
      limit: z.number().optional().describe('Maximum number of teams to return'),
      offset: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.number().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          organizationId: z.number().optional().describe('Organization ID')
        })
      ),
      total: z.number().optional().describe('Total number of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listTeams(ctx.input.organizationId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let teams = (result.teams ?? result ?? []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      organizationId: t.organizationId
    }));

    return {
      output: {
        teams,
        total: result.pg?.total
      },
      message: `Found **${teams.length}** team(s) in organization ${ctx.input.organizationId}.`
    };
  })
  .build();
