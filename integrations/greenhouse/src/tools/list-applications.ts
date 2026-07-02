import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapApplication } from '../lib/mappers';
import { spec } from '../spec';

export let listApplicationsTool = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List and filter applications in Greenhouse. Filter by job, status (active, rejected, hired), or date ranges. Returns paginated results with current stage and source information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
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
      applications: z.array(
        z.object({
          applicationId: z.string(),
          candidateId: z.string(),
          prospect: z.boolean(),
          status: z.string().nullable(),
          appliedAt: z.string().nullable(),
          rejectedAt: z.string().nullable(),
          lastActivityAt: z.string().nullable(),
          source: z
            .object({ sourceId: z.string(), publicName: z.string().nullable() })
            .nullable(),
          currentStage: z.object({ stageId: z.string(), name: z.string() }).nullable(),
          jobs: z.array(z.object({ jobId: z.string(), name: z.string() })),
          location: z.string().nullable()
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

    let results = await client.listApplications({
      page: ctx.input.page,
      perPage,
      jobId: ctx.input.jobId ? Number.parseInt(ctx.input.jobId, 10) : undefined,
      status: ctx.input.status,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore
    });

    let applications = results.map(mapApplication);

    return {
      output: {
        applications,
        hasMore: results.length >= perPage
      },
      message: `Found ${applications.length} application(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
