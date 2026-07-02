import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageJobTool = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Manage a bulk verification job by performing lifecycle actions: parse a job to begin indexing, start verification on a parsed job, or permanently delete a job and its results.`,
  instructions: [
    'Use "parse" on jobs created with autoParse disabled to begin indexing.',
    'Use "start" on jobs that have been parsed but not started (created with autoStart disabled).',
    'Use "delete" to permanently remove a job. This cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('The job ID to manage'),
      action: z
        .enum(['parse', 'start', 'delete'])
        .describe('The action to perform on the job'),
      autoStart: z
        .boolean()
        .optional()
        .describe('When parsing, whether to auto-start verification after parsing completes'),
      runSample: z
        .boolean()
        .optional()
        .describe('When starting, run as a free sample instead of full verification')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action completed successfully'),
      queueId: z.string().optional().describe('Queue ID for parse or start actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { jobId, action } = ctx.input;

    if (action === 'parse') {
      let result = await client.parseJob(jobId, ctx.input.autoStart);
      return {
        output: { success: true, queueId: result.queueId },
        message: `Job **${jobId}** parsing started.${ctx.input.autoStart ? ' Verification will begin automatically after parsing.' : ''}`
      };
    }

    if (action === 'start') {
      let result = await client.startJob(jobId, ctx.input.runSample);
      return {
        output: { success: true, queueId: result.queueId },
        message: `Job **${jobId}** verification started.${ctx.input.runSample ? ' Running as free sample.' : ''}`
      };
    }

    // delete
    await client.deleteJob(jobId);
    return {
      output: { success: true },
      message: `Job **${jobId}** has been permanently deleted.`
    };
  })
  .build();
