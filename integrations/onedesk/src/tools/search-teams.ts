import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTeams = SlateTool.create(spec, {
  name: 'Search Teams',
  key: 'search_teams',
  description:
    'Discover teams and their external IDs with detailed results. Requires an API key connection.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      nameContains: z
        .string()
        .optional()
        .describe('Optional substring to match against name.'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(50)
        .describe('Maximum number of results, a whole number from 1 to 50.'),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Number of results to skip, a non-negative whole number.')
    })
  )
  .output(
    z.object({
      teams: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Matching teams, including stable external IDs and profile details.'),
      count: z.number().describe('Number of results returned in this page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let teams = await client.searchTeams({
      properties:
        ctx.input.nameContains !== undefined
          ? [{ property: 'name', operation: 'CONTAINS', value: ctx.input.nameContains }]
          : undefined,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: { teams, count: teams.length },
      message: `Found **${teams.length}** teams.`
    };
  })
  .build();
