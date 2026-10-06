import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  invalid,
  mapJob,
  pageInput,
  pageOutput,
  pageSchema,
  rows,
  text,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.string().describe('Unique ID of the job'),
  title: z.string().describe('Job title'),
  status: z.string().describe('Current status of the job'),
  locationId: z.string().optional().describe('Location ID associated with the job'),
  departmentId: z.string().optional().describe('Department ID associated with the job'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Lists one native job page, reads an exact jobId, or performs bounded title search. Status-only filtering uses the list endpoint. Combined title/status filtering applies status to the bounded search results.`,
  instructions: [
    'To browse all jobs, call with no parameters or use cursor for pagination.',
    'To search by keyword or filter by status, provide searchTerm and/or status.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z
        .string()
        .optional()
        .describe('Exact job ID to retrieve; omit filters and pagination for this mode.'),
      syncToken: z
        .string()
        .optional()
        .describe('Incremental sync token for list mode; preserve it with the cursor.'),
      searchTerm: z
        .string()
        .optional()
        .describe('Bounded title search; perPage is the maximum search result count'),
      status: z
        .enum(['Open', 'Closed', 'Archived', 'Draft'])
        .optional()
        .describe('Filter jobs by status'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request'),
      perPage: z.number().optional().default(50).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema).describe('List of jobs matching the query'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page'),
      searchLimit: z.number().optional(),
      searchLimitReached: z.boolean().optional(),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    pageInput(input);
    if (input.jobId !== undefined) {
      if (
        input.searchTerm !== undefined ||
        input.status !== undefined ||
        input.cursor !== undefined ||
        input.syncToken !== undefined
      )
        invalid('Use jobId alone for an exact job read.');
      const job = mapJob((await client.getJob(input.jobId)).results);
      return {
        output: { jobs: [job], warnings: client.warnings },
        message: 'Retrieved the exact visible job.'
      };
    }
    if (input.searchTerm !== undefined) {
      if (input.cursor !== undefined || input.syncToken !== undefined)
        invalid(
          'Job title search is bounded and does not accept pagination or sync tokens. Use list mode for a complete traversal.'
        );
      const limit = input.perPage ?? 50,
        result = await client.post('/job.search', {
          title: text(input.searchTerm, 'Job title search'),
          limit
        }),
        matched = rows(result.results),
        jobs = matched
          .filter(job => input.status === undefined || job.status === input.status)
          .map(mapJob);
      return {
        output: {
          jobs,
          searchLimit: limit,
          searchLimitReached: matched.length === limit,
          warnings: client.warnings
        },
        message:
          'Retrieved bounded title-search results; an optional status filter applies to those results only. This is not a complete paginated job traversal.'
      };
    }
    const result = await client.list('/job.list', input, { status: input.status });
    return {
      output: {
        jobs: rows(result.results).map(mapJob),
        ...pageOutput(result),
        warnings: client.warnings
      },
      message: 'Retrieved one job page. Follow pageInfo until moreDataAvailable is false.'
    };
  })
  .build();
