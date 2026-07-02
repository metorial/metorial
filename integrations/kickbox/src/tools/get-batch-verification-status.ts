import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatchVerificationStatus = SlateTool.create(spec, {
  name: 'Get Batch Verification Status',
  key: 'get_batch_verification_status',
  description: `Check the status and results of a previously submitted batch verification job. Returns progress details, verification result counts, and a download URL when the job is complete.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      batchId: z
        .number()
        .describe('The batch verification job ID returned when the batch was created.')
    })
  )
  .output(
    z.object({
      batchId: z.number().describe('The batch verification job ID.'),
      name: z.string().describe('The name of the batch job.'),
      status: z
        .string()
        .describe('Current status of the batch job (e.g. completed, processing).'),
      createdAt: z.string().describe('When the batch job was created.'),
      total: z.number().describe('Total number of email addresses in the batch.'),
      deliverable: z.number().describe('Number of deliverable email addresses.'),
      undeliverable: z.number().describe('Number of undeliverable email addresses.'),
      risky: z.number().describe('Number of risky email addresses.'),
      unknown: z.number().describe('Number of unknown email addresses.'),
      sendexScore: z.number().describe('Average Sendex quality score for the batch.'),
      duration: z.number().describe('Time taken to process the batch in seconds.'),
      downloadUrl: z
        .string()
        .optional()
        .describe('URL to download the full results CSV when the job is complete.'),
      progress: z
        .object({
          deliverable: z.number(),
          undeliverable: z.number(),
          risky: z.number(),
          unknown: z.number(),
          completed: z.number()
        })
        .optional()
        .describe('Progress details while the batch is still processing.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBatchStatus(ctx.input.batchId);

    if (!result.success) {
      throw new Error(result.message || 'Failed to retrieve batch verification status.');
    }

    let output = {
      batchId: result.id,
      name: result.name,
      status: result.status,
      createdAt: result.created_at,
      total: result.total,
      deliverable: result.deliverable,
      undeliverable: result.undeliverable,
      risky: result.risky,
      unknown: result.unknown,
      sendexScore: result.sendex,
      duration: result.duration,
      downloadUrl: result.download_url,
      progress: result.progress
    };

    let messageParts = [`Batch **${result.id}** is **${result.status}**.`];
    if (result.total > 0) {
      messageParts.push(
        `Total: ${result.total} emails — Deliverable: ${result.deliverable}, Undeliverable: ${result.undeliverable}, Risky: ${result.risky}, Unknown: ${result.unknown}.`
      );
    }
    if (result.sendex > 0) {
      messageParts.push(`Average Sendex score: **${result.sendex}**.`);
    }
    if (result.download_url) {
      messageParts.push(`[Download results](${result.download_url})`);
    }

    return {
      output,
      message: messageParts.join(' ')
    };
  })
  .build();
