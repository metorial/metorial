import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Retrieve a paginated list of jobs from AccuLynx. Filter by date range, milestones, assignment status, and control sorting. Optionally include related contact and initial appointment data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of items per page'),
      pageStartIndex: z
        .number()
        .optional()
        .describe('Index of the first element to return (default: 0, max: 100000)'),
      startDate: z.string().optional().describe('Start date filter in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date filter in YYYY-MM-DD format'),
      filterByDate: z
        .enum(['CreatedDate', 'ModifiedDate'])
        .optional()
        .describe('Which date field to filter on'),
      milestones: z
        .string()
        .optional()
        .describe('Comma-separated milestone names to filter (e.g. "Lead,Dead")'),
      sortBy: z
        .enum(['CreatedDate', 'MilestoneDate', 'ModifiedDate'])
        .optional()
        .describe('Field to sort results by'),
      sortOrder: z.enum(['Ascending', 'Descending']).optional().describe('Sort direction'),
      includes: z
        .string()
        .optional()
        .describe(
          'Comma-separated related data to include (e.g. "contact,initialAppointment")'
        ),
      assignment: z.enum(['unassigned']).optional().describe('Filter by assignment status')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('Array of job summary objects'),
      totalCount: z.number().optional().describe('Total number of matching jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobs({
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      filterByDate: ctx.input.filterByDate,
      milestones: ctx.input.milestones,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      includes: ctx.input.includes,
      assignment: ctx.input.assignment
    });

    let jobs = Array.isArray(result) ? result : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.totalCount ?? result?.total ?? jobs.length;

    return {
      output: { jobs, totalCount },
      message: `Retrieved **${jobs.length}** jobs${totalCount > jobs.length ? ` (of ${totalCount} total)` : ''}.`
    };
  })
  .build();
