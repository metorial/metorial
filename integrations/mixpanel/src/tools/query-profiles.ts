import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let queryProfiles = SlateTool.create(spec, {
  name: 'Query User Profiles',
  key: 'query_profiles',
  description: `Search and retrieve user profiles from Mixpanel. Filter by property expressions, specific distinct IDs, or cohort membership.
Returns paginated results with profile properties. Use sessionId and page for pagination.`,
  constraints: [
    'Rate limit: 60 queries per hour, max 5 concurrent queries.',
    'Returns up to 1000 profiles per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      where: z
        .string()
        .optional()
        .describe(
          'Filter expression using Mixpanel segmentation syntax (e.g., \'properties["plan"] == "premium"\')'
        ),
      distinctId: z.string().optional().describe('Specific user distinct ID to look up'),
      outputProperties: z
        .array(z.string())
        .optional()
        .describe('Specific property names to return (returns all if omitted)'),
      cohortId: z.number().optional().describe('Filter profiles by cohort membership'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID from a previous query for pagination'),
      page: z.number().optional().describe('Page number for pagination (requires sessionId)')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of results per page'),
      sessionId: z.string().describe('Session ID for paginating subsequent requests'),
      total: z.number().describe('Total number of matching profiles'),
      results: z
        .array(
          z.object({
            distinctId: z.string().describe('User distinct ID'),
            properties: z.record(z.string(), z.unknown()).describe('User profile properties')
          })
        )
        .describe('Matching user profiles')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);

    let result = await client.queryProfiles({
      where: ctx.input.where,
      distinctId: ctx.input.distinctId,
      outputProperties: ctx.input.outputProperties,
      filterByCohort: ctx.input.cohortId,
      sessionId: ctx.input.sessionId,
      page: ctx.input.page
    });

    return {
      output: result,
      message: `Found **${result.total}** matching profile(s). Showing page ${result.page} with **${result.results.length}** result(s).`
    };
  })
  .build();
