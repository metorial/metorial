import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Perform actions on a Serverless job: cancel a running/queued job, retry a failed/timed-out job, or purge all pending jobs from the queue.`,
  instructions: [
    'Cancel stops a job that is in progress or waiting in queue.',
    'Retry requeues a failed or timed-out job with the same ID and original input.',
    'Purge clears all pending jobs from the queue; does not affect jobs already in progress.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      endpointId: z.string().describe('ID of the Serverless endpoint'),
      action: z.enum(['cancel', 'retry', 'purge_queue']).describe('Action to perform'),
      jobId: z
        .string()
        .optional()
        .describe('Job ID (required for cancel and retry, not for purge_queue)')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Endpoint ID'),
      action: z.string().describe('Action performed'),
      jobId: z.string().nullable().describe('Affected job ID'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { endpointId, action, jobId } = ctx.input;

    if (action === 'purge_queue') {
      await client.purgeQueue(endpointId);
    } else {
      if (!jobId) {
        throw new Error(`jobId is required for action "${action}".`);
      }
      if (action === 'cancel') {
        await client.cancelJob(endpointId, jobId);
      } else {
        await client.retryJob(endpointId, jobId);
      }
    }

    let message =
      action === 'purge_queue'
        ? `Purged all pending jobs from endpoint **${endpointId}**.`
        : `Successfully **${action === 'cancel' ? 'cancelled' : 'retried'}** job **${jobId}** on endpoint **${endpointId}**.`;

    return {
      output: {
        endpointId,
        action,
        jobId: jobId ?? null,
        success: true
      },
      message
    };
  })
  .build();
