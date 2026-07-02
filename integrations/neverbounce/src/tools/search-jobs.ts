import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchJobsTool = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Search and list verification jobs in your account. Filter by job ID, filename, or status. Returns paginated results with job metadata and verification statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.number().optional().describe('Filter by specific job ID'),
      filename: z.string().optional().describe('Filter by exact filename'),
      jobStatus: z
        .string()
        .optional()
        .describe('Filter by job status (e.g., complete, running, failed, queued)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      itemsPerPage: z.number().optional().describe('Results per page (default: 10)')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total matching jobs'),
      totalPages: z.number().describe('Total pages'),
      jobs: z
        .array(
          z.object({
            jobId: z.number().describe('Job ID'),
            filename: z.string().describe('Job filename'),
            jobStatus: z.string().describe('Current status'),
            createdAt: z.string().describe('Creation timestamp'),
            startedAt: z.string().describe('Start timestamp'),
            finishedAt: z.string().describe('Completion timestamp'),
            totalRecords: z.number().describe('Total records in the job'),
            totalProcessed: z.number().describe('Number of records processed'),
            bounceEstimate: z.number().describe('Estimated bounce rate (0-100)'),
            percentComplete: z.number().describe('Completion percentage (0-100)')
          })
        )
        .describe('List of matching jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchJobs({
      jobId: ctx.input.jobId,
      filename: ctx.input.filename,
      jobStatus: ctx.input.jobStatus,
      page: ctx.input.page,
      itemsPerPage: ctx.input.itemsPerPage
    });

    return {
      output: {
        totalResults: result.totalResults,
        totalPages: result.totalPages,
        jobs: result.results.map(j => ({
          jobId: j.jobId,
          filename: j.filename,
          jobStatus: j.jobStatus,
          createdAt: j.createdAt,
          startedAt: j.startedAt,
          finishedAt: j.finishedAt,
          totalRecords: j.total.records,
          totalProcessed: j.total.processed,
          bounceEstimate: j.bounceEstimate,
          percentComplete: j.percentComplete
        }))
      },
      message: `Found **${result.totalResults}** job(s) across ${result.totalPages} page(s).`
    };
  })
  .build();
