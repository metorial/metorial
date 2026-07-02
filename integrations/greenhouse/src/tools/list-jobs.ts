import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapJob } from '../lib/mappers';
import { spec } from '../spec';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List and filter jobs in Greenhouse. Filter by status (open, closed, draft), department, or office. Returns paginated results with department, office, and opening information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
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
      jobs: z.array(
        z.object({
          jobId: z.string(),
          name: z.string(),
          requisitionId: z.string().nullable(),
          status: z.string().nullable(),
          confidential: z.boolean(),
          departments: z.array(z.object({ departmentId: z.string(), name: z.string() })),
          offices: z.array(z.object({ officeId: z.string(), name: z.string() })),
          openings: z.array(
            z.object({
              openingId: z.string(),
              status: z.string().nullable(),
              openedAt: z.string().nullable(),
              closedAt: z.string().nullable()
            })
          ),
          createdAt: z.string().nullable(),
          updatedAt: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listJobs({
      page: ctx.input.page,
      perPage,
      status: ctx.input.status,
      departmentId: ctx.input.departmentId
        ? Number.parseInt(ctx.input.departmentId, 10)
        : undefined,
      officeId: ctx.input.officeId ? Number.parseInt(ctx.input.officeId, 10) : undefined
    });

    let jobs = results.map(mapJob);

    return {
      output: {
        jobs,
        hasMore: results.length >= perPage
      },
      message: `Found ${jobs.length} job(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
