import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { candidateOutputSchema, mapCandidate } from '../lib/mappers';
import { spec } from '../spec';
export const listCandidatesTool = SlateTool.create(spec, {
  key: 'list_candidates',
  name: 'List Candidates',
  description:
    'List candidates by email or one date range. Harvest v3 job filtering is available through list_applications.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      email: z.string().optional().describe('Filter candidates by email address'),
      jobId: z
        .string()
        .optional()
        .describe('Retired v3 filter. Use list_applications with jobId, then get_candidate.'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return candidates created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return candidates created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return candidates updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return candidates updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      candidates: z.array(candidateOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listCandidates(ctx.input);
    return {
      output: {
        candidates: page.items.map(mapCandidate),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
