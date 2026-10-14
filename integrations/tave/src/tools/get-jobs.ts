import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient, textField } from '../lib/client';
import { spec } from '../spec';

export let getJobs = SlateTool.create(spec, {
  name: 'Get Jobs',
  key: 'get_jobs',
  description:
    'Lists jobs and leads with their IDs, stages, job types, and brand IDs. Use it to find existing jobs and inspect jobs created by create_job. Requires API Key (Public API V2) authentication.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Results per page, from 10 to 100'),
      includeClosed: z.boolean().optional().describe('Include closed jobs and leads'),
      externalMappingId: z.string().optional().describe('Filter by an external mapping ID')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobId: z.string().describe('Job ID'),
          name: z.string().optional().describe('Job name or generated title'),
          jobType: z.string().optional().describe('Job type name'),
          jobTypeId: z.string().optional().describe('Job type ID'),
          brandId: z.string().optional().describe('Associated brand ID'),
          stage: z.string().optional().describe('Job stage'),
          eventDate: z.string().optional().describe('Event date'),
          raw: z.any().describe('Full job record')
        })
      ),
      totalCount: z.number().describe('Total number of matching jobs'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TavePublicClient(ctx.auth).listJobs(ctx.input);
    let jobs = result.items.map(item => ({
      jobId: String(item.id ?? ''),
      name: textField(item, 'name', 'title'),
      jobType: textField(item, 'jobTypeName'),
      jobTypeId: textField(item, 'jobTypeId'),
      brandId: textField(item, 'brandId'),
      stage: textField(item, 'stage'),
      eventDate: textField(item, 'eventDate'),
      raw: item
    }));
    return {
      output: {
        jobs,
        totalCount: result.meta.totalItems,
        currentPage: result.meta.currentPage,
        totalPages: result.meta.totalPages
      },
      message: `Retrieved **${jobs.length}** job(s).`
    };
  })
  .build();
