import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List teams on the Amara platform. Returns paginated team details including visibility settings and policies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of teams'),
      teams: z.array(
        z.object({
          name: z.string().describe('Team name'),
          teamSlug: z.string().describe('Team slug identifier'),
          type: z.string().describe('Team type (default, simple, collaboration)'),
          description: z.string().describe('Team description'),
          teamVisibility: z.string().describe('Team visibility'),
          membershipPolicy: z.string().describe('Membership policy')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listTeams({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let teams = result.objects.map(t => ({
      name: t.name,
      teamSlug: t.slug,
      type: t.type,
      description: t.description,
      teamVisibility: t.team_visibility,
      membershipPolicy: t.membership_policy
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        teams
      },
      message: `Found **${result.meta.total_count}** team(s). Returned ${teams.length} results.`
    };
  })
  .build();
