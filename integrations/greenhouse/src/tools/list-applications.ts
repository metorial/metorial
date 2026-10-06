import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { applicationOutputSchema, mapApplication } from '../lib/mappers';
import { spec } from '../spec';
export const listApplicationsTool = SlateTool.create(spec, {
  key: 'list_applications',
  name: 'List Applications',
  description:
    'List applications by job, candidate, status or one date range. Returns current job interview stage and relationship IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      candidateId: z.string().optional().describe('Filter by candidate ID.'),
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
      jobId: z.string().optional().describe('Filter by job ID'),
      status: z
        .enum(['active', 'rejected', 'hired'])
        .optional()
        .describe('Filter by application status'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return applications created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return applications created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return applications updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return applications updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      applications: z.array(applicationOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listApplications(ctx.input);
    return {
      output: {
        applications: page.items.map(mapApplication),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
