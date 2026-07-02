import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let jobTotalsSchema = z.object({
  records: z.number().describe('Total rows found in the file'),
  billable: z.number().describe('Syntactically valid emails (credit cost)'),
  processed: z.number().describe('Emails verified so far'),
  valid: z.number().describe('Count of valid emails'),
  invalid: z.number().describe('Count of invalid emails'),
  catchall: z.number().describe('Count of catchall emails'),
  disposable: z.number().describe('Count of disposable emails'),
  unknown: z.number().describe('Count of unknown emails'),
  duplicates: z.number().describe('Count of duplicate entries'),
  badSyntax: z.number().describe('Count of bad syntax entries')
});

export let getJobStatusTool = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Retrieve the current status and progress of a bulk verification job. Returns the job status, verification statistics, bounce estimate, and completion percentage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('The job ID to check status for')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('The job ID'),
      jobStatus: z
        .string()
        .describe(
          'Current job status (e.g., complete, running, parsing, queued, failed, under_review, waiting)'
        ),
      filename: z.string().describe('Filename associated with the job'),
      createdAt: z.string().describe('Job creation timestamp'),
      startedAt: z.string().describe('Job start timestamp'),
      finishedAt: z.string().describe('Job completion timestamp'),
      total: jobTotalsSchema.describe('Verification statistics'),
      bounceEstimate: z.number().describe('Estimated bounce rate (0-100)'),
      percentComplete: z.number().describe('Verification progress percentage (0-100)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobStatus(ctx.input.jobId);

    return {
      output: {
        jobId: result.jobId,
        jobStatus: result.jobStatus,
        filename: result.filename,
        createdAt: result.createdAt,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        total: result.total,
        bounceEstimate: result.bounceEstimate,
        percentComplete: result.percentComplete
      },
      message: `Job **${ctx.input.jobId}** is **${result.jobStatus}** (${result.percentComplete}% complete). Bounce estimate: ${result.bounceEstimate}%.`
    };
  })
  .build();
