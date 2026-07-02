import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List CloudConvert jobs with optional filtering by status and tag.

Use this to monitor recent jobs, find specific jobs by tag, or review processing history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['waiting', 'processing', 'finished', 'error'])
        .optional()
        .describe('Filter by job status'),
      tag: z.string().optional().describe('Filter by job tag'),
      perPage: z
        .number()
        .optional()
        .default(25)
        .describe('Number of results per page (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('ID of the job'),
            status: z.string().describe('Job status'),
            tag: z.string().optional().describe('Job tag'),
            taskCount: z.number().describe('Number of tasks in the job'),
            createdAt: z.string().optional().describe('Job creation timestamp'),
            endedAt: z.string().optional().describe('Job completion timestamp')
          })
        )
        .describe('List of jobs'),
      totalCount: z.number().optional().describe('Total number of matching jobs'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listJobs({
      status: ctx.input.status,
      tag: ctx.input.tag,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let jobs = (result.data ?? []).map((j: any) => ({
      jobId: j.id,
      status: j.status,
      tag: j.tag,
      taskCount: j.tasks?.length ?? 0,
      createdAt: j.created_at,
      endedAt: j.ended_at
    }));

    return {
      output: {
        jobs,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page
      },
      message: `Found ${jobs.length} job(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
