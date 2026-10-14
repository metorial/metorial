import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let getIntellimatchStatus = SlateTool.create(spec, {
  name: 'Get IntelliMatch Search Status',
  key: 'get_intellimatch_status',
  description:
    'Check the status and progress of an asynchronous IntelliMatch search. Obtain the export hash from intellimatch_search. Retrieve results with get_intellimatch_results when status is success.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      hash: z
        .string()
        .min(1)
        .describe('Export hash returned by intellimatch_search as hash or searchId.')
    })
  )
  .output(
    z.object({
      hash: z.string().describe('Export hash for this search.'),
      status: z
        .string()
        .describe('Search state: pending, processing, success, failed, or not_found.'),
      progress: z.number().optional().describe('Processing progress as a percentage.'),
      totalJobs: z.number().optional().describe('Total processing jobs.'),
      processedJobs: z.number().optional().describe('Jobs already processed.'),
      pendingJobs: z.number().optional().describe('Jobs waiting to be processed.'),
      failedJobs: z.number().optional().describe('Jobs that failed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });
    let result = await client.getIntellimatchStatus({ hash: ctx.input.hash });
    return {
      output: {
        hash: ctx.input.hash,
        status: result.status,
        progress: result.progress,
        totalJobs: result.total_jobs,
        processedJobs: result.processed_jobs,
        pendingJobs: result.pending_jobs,
        failedJobs: result.failed_jobs
      },
      message: `IntelliMatch search status: **${result.status}**${result.progress !== undefined ? ` (${result.progress}%)` : ''}.`
    };
  })
  .build();
