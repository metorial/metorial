import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadJobResultsTool = SlateTool.create(spec, {
  name: 'Download Job Results',
  key: 'download_job_results',
  description:
    'Download the results of a completed bulk verification job as a CSV file. Optionally select verification result categories and include duplicate records.',
  instructions: ['Use search_jobs to find a job ID and get_job_status to check completion.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z.number().int().positive().describe('Completed job ID from search_jobs'),
      resultTypes: z
        .array(z.enum(['valid', 'invalid', 'disposable', 'catchall', 'unknown']))
        .min(1)
        .optional()
        .describe('Result categories to include; omit to include all five categories'),
      includeDuplicates: z
        .boolean()
        .optional()
        .describe('Include every occurrence of duplicate records (default: false)')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('The downloaded job ID'),
      fileName: z.string().describe('CSV filename'),
      mimeType: z.string().describe('File content type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getJobStatus(ctx.input.jobId);
    if (job.jobStatus !== 'complete') {
      throw createApiServiceError(
        `Job ${ctx.input.jobId} is ${job.jobStatus}. Wait until it is complete before downloading results.`
      );
    }

    let query: Record<string, string> = {
      key: ctx.auth.token,
      job_id: String(ctx.input.jobId),
      email_status: '1'
    };
    if (ctx.input.resultTypes) {
      let resultParameters = {
        valid: 'valids',
        invalid: 'invalids',
        disposable: 'disposables',
        catchall: 'catchalls',
        unknown: 'unknowns'
      } as const;
      for (let [result, parameter] of Object.entries(resultParameters)) {
        query[parameter] = ctx.input.resultTypes.some(type => type === result) ? '1' : '0';
      }
    }
    if (ctx.input.includeDuplicates !== undefined) {
      query.include_duplicates = ctx.input.includeDuplicates ? '1' : '0';
    }

    let fileName = `neverbounce-job-${ctx.input.jobId}.csv`;
    let mimeType = 'text/csv';
    await ctx.addAttachment({
      type: 'url',
      url: 'https://api.neverbounce.com/v4.2/jobs/download',
      query,
      filename: fileName,
      mimeType
    });

    return {
      output: { jobId: ctx.input.jobId, fileName, mimeType },
      message: `Prepared verification results for job **${ctx.input.jobId}** as a downloadable CSV.`
    };
  })
  .build();
