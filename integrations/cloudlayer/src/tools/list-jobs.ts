import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List your document generation jobs, ordered by creation date (newest first). Supports pagination to browse through job history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of jobs to return (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset (default 0)')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier'),
            status: z.string().describe('Job status'),
            jobType: z.string().optional().describe('Type of job'),
            fileSize: z.number().optional().describe('Output file size in bytes'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listJobs({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let jobs = Array.isArray(result) ? result : (result.jobs ?? result.data ?? []);

    let mappedJobs = jobs.map((job: Record<string, unknown>) => ({
      jobId: (job.id ?? job.jobId ?? '') as string,
      status: (job.status ?? 'unknown') as string,
      jobType: (job.type ?? job.jobType) as string | undefined,
      fileSize: (job.size ?? job.fileSize) as number | undefined,
      createdAt: (job.timestamp ?? job.createdAt) as string | undefined
    }));

    return {
      output: { jobs: mappedJobs },
      message: `Found **${mappedJobs.length}** jobs.`
    };
  })
  .build();
