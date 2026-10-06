import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { jobOutputSchema, mapJob } from '../lib/mappers';
import { spec } from '../spec';
export const listJobsTool = SlateTool.create(spec, {
  key: 'list_jobs',
  name: 'List Jobs',
  description:
    'List jobs by status, department or office. Returns department and office IDs; expanded v1 relationship names are unavailable.',
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
      status: z.enum(['open', 'closed', 'draft']).optional().describe('Filter by job status'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      officeId: z.string().optional().describe('Filter by office ID')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listJobs(ctx.input);
    return {
      output: {
        jobs: page.items.map(mapJob),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
