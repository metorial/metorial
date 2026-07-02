import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Retry a failed job or unblock a blocked step in a Buildkite build. Retry re-runs a failed or timed-out job. Unblock releases a manual/block step so the build can continue.`,
  instructions: [
    'Use the "Get Build" tool first to find the job ID you want to manage.',
    'Each job can only be retried once. To retry again, use the new job ID from the retried job.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      buildNumber: z.number().describe('Build number containing the job'),
      jobId: z.string().describe('UUID of the job to retry or unblock'),
      action: z.enum(['retry', 'unblock']).describe('Action to perform on the job'),
      unblockFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Fields to pass when unblocking (for block steps with input fields)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('UUID of the job (for retry, this is the new job ID)'),
      state: z.string().describe('State of the job after the action'),
      type: z.string().describe('Type of the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let j: any;
    if (ctx.input.action === 'retry') {
      j = await client.retryJob(
        ctx.input.pipelineSlug,
        ctx.input.buildNumber,
        ctx.input.jobId
      );
    } else {
      j = await client.unblockJob(
        ctx.input.pipelineSlug,
        ctx.input.buildNumber,
        ctx.input.jobId,
        ctx.input.unblockFields
      );
    }

    return {
      output: {
        jobId: j.id,
        state: j.state,
        type: j.type
      },
      message:
        ctx.input.action === 'retry'
          ? `Retried job, new job ID: \`${j.id}\`.`
          : `Unblocked job \`${ctx.input.jobId}\`.`
    };
  });
