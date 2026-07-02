import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Retrieve a list of historical jobs across all agents or filtered by a specific agent. Returns job summaries including status, timestamps, and page counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z
        .string()
        .optional()
        .describe(
          'Filter jobs by a specific agent ID. If omitted, returns jobs from all agents.'
        ),
      offset: z
        .number()
        .optional()
        .describe('Number of jobs to skip for pagination. Defaults to 0.'),
      limit: z.number().optional().describe('Maximum number of jobs to return.')
    })
  )
  .output(
    z.object({
      total: z
        .number()
        .optional()
        .nullable()
        .describe('Total number of jobs matching the query.'),
      returned: z.number().describe('Number of jobs returned in this response.'),
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier.'),
            agentId: z.string().optional().nullable().describe('Agent ID the job belongs to.'),
            status: z
              .string()
              .describe('Job status (e.g. "completed", "running", "failed", "stopped").'),
            pagesProcessed: z
              .number()
              .optional()
              .nullable()
              .describe('Number of pages processed.'),
            pagesSucceeded: z
              .number()
              .optional()
              .nullable()
              .describe('Number of pages successfully scraped.'),
            pagesFailed: z
              .number()
              .optional()
              .nullable()
              .describe('Number of pages that failed.'),
            createdAt: z
              .string()
              .optional()
              .nullable()
              .describe('ISO 8601 creation timestamp.'),
            completedAt: z
              .string()
              .optional()
              .nullable()
              .describe('ISO 8601 completion timestamp.')
          })
        )
        .describe('List of jobs.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listJobs({
      agent_id: ctx.input.agentId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let jobs = (result.result || []).map((j: any) => ({
      jobId: j.job_id,
      agentId: j.agent_id,
      status: j.status,
      pagesProcessed: j.pages_processed,
      pagesSucceeded: j.pages_successed ?? j.pages_succeeded,
      pagesFailed: j.pages_failed,
      createdAt: j.created_at,
      completedAt: j.completed_at
    }));

    return {
      output: {
        total: result.total,
        returned: jobs.length,
        jobs
      },
      message: `Found **${result.total ?? jobs.length}** jobs${ctx.input.agentId ? ` for agent ${ctx.input.agentId}` : ''}, returned **${jobs.length}**.`
    };
  })
  .build();
