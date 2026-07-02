import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the current status and progress of a scraping job. Returns status, pages processed, success/failure counts, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job to check.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The job ID.'),
      agentId: z.string().optional().nullable().describe('Agent ID the job belongs to.'),
      status: z
        .string()
        .describe('Current job status (e.g. "running", "completed", "stopped", "failed").'),
      pagesCredit: z.number().optional().nullable().describe('Total page credits used.'),
      pagesProcessed: z
        .number()
        .optional()
        .nullable()
        .describe('Number of pages processed so far.'),
      pagesSucceeded: z
        .number()
        .optional()
        .nullable()
        .describe('Number of pages successfully scraped.'),
      pagesFailed: z.number().optional().nullable().describe('Number of pages that failed.'),
      progress: z.number().optional().nullable().describe('Job progress percentage (0-100).'),
      createdAt: z
        .string()
        .optional()
        .nullable()
        .describe('ISO 8601 timestamp when the job was created.'),
      completedAt: z
        .string()
        .optional()
        .nullable()
        .describe('ISO 8601 timestamp when the job completed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let j = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: j.job_id,
        agentId: j.agent_id,
        status: j.status,
        pagesCredit: j.pages_credit,
        pagesProcessed: j.pages_processed,
        pagesSucceeded: j.pages_successed ?? j.pages_succeeded,
        pagesFailed: j.pages_failed,
        progress: j.progress,
        createdAt: j.created_at,
        completedAt: j.completed_at
      },
      message: `Job **${j.job_id}** is **${j.status}**. Progress: ${j.progress ?? 'N/A'}%. Pages processed: ${j.pages_processed ?? 0}.`
    };
  })
  .build();
