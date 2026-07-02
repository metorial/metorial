import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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

let mapJob = (j: any) => ({
  jobId: j.id,
  title: j.title,
  status: j.status,
  locationId: j.locationId || undefined,
  departmentId: j.departmentId || undefined,
  createdAt: j.createdAt,
  updatedAt: j.updatedAt
});

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Lists or searches jobs in Ashby. Can paginate through all jobs or search by term and status. When a search term or status filter is provided, the search endpoint is used instead of the list endpoint.`,
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
      searchTerm: z
        .string()
        .optional()
        .describe('Search term to filter jobs by title or other fields'),
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
      nextCursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { searchTerm, status, cursor, perPage } = ctx.input;

    if (searchTerm !== undefined || status !== undefined) {
      let searchParams: { term?: string; status?: string } = {};
      if (searchTerm !== undefined) searchParams.term = searchTerm;
      if (status !== undefined) searchParams.status = status;

      let result = await client.searchJobs(searchParams);
      let jobs = (result.results || []).map(mapJob);

      return {
        output: { jobs },
        message: `Found **${jobs.length}** jobs matching search criteria.`
      };
    }

    let result = await client.listJobs({ cursor, perPage });
    let jobs = (result.results || []).map(mapJob);

    return {
      output: {
        jobs,
        nextCursor: result.moreDataAvailable ? result.nextCursor : undefined
      },
      message: `Found **${jobs.length}** jobs${result.moreDataAvailable ? ' (more available)' : ''}.`
    };
  })
  .build();
