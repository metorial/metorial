import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging } from '../lib/schemas';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve a bounded page of teams belonging to an organization. Teams are the primary container for scenarios, connections, and other Make resources.`,
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
          teamId: z
            .number()
            .describe(
              'Team ID; call list_teams after list_organizations to discover authorized IDs.'
            ),
          name: z.string().optional().describe('Team name'),
          organizationId: z.number().optional().describe('Organization ID')
        })
      ),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of teams')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listTeams(ctx.input.organizationId, ctx.input);
    const teams = result.teams.map(t => ({
      teamId: t.id,
      name: t.name,
      organizationId: t.organizationId
    }));
    return {
      output: { teams, page: result.pg },
      message: `Returned ${teams.length} authorized teams in this page.`
    };
  })
  .build();
