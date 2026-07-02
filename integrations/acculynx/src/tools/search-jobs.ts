import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchJobsTool = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Search for jobs in AccuLynx by a text query. Returns paginated results matching the search criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query text'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageStartIndex: z.number().optional().describe('Index of the first element to return')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('Array of matching job objects'),
      totalCount: z.number().optional().describe('Total number of matching jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchJobs({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex
    });

    let jobs = Array.isArray(result) ? result : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.totalCount ?? result?.total ?? jobs.length;

    return {
      output: { jobs, totalCount },
      message: `Found **${jobs.length}** jobs matching query "${ctx.input.query ?? ''}".`
    };
  })
  .build();
