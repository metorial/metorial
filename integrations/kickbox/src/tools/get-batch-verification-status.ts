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
      name: z.string().optional().describe('The name of the batch job, when available.'),
      status: z
        .string()
        .describe('Current status of the batch job (e.g. completed, processing).'),
      createdAt: z
        .string()
        .optional()
        .describe('When the batch job was created, when available.'),
      total: z
        .number()
        .optional()
        .describe('Total number of email addresses in the batch, when available.'),
      deliverable: z
        .number()
        .optional()
        .describe('Number of deliverable email addresses, when available.'),
      undeliverable: z
        .number()
        .optional()
        .describe('Number of undeliverable email addresses, when available.'),
      risky: z
        .number()
        .optional()
        .describe('Number of risky email addresses, when available.'),
      unknown: z
        .number()
        .optional()
        .describe('Number of unknown email addresses, when available.'),
      sendexScore: z
        .number()
        .optional()
        .describe('Average Sendex quality score for the batch, when available.'),
      duration: z
        .number()
        .optional()
        .describe('Time taken to process the batch in seconds, when available.'),
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
          completed: z.number().optional(),
          total: z.number().optional(),
          unprocessed: z.number().optional()
        })
        .optional()
        .describe('Progress details while the batch is still processing.'),
      details: z
        .record(z.string(), z.unknown())
        .describe('Full batch status details returned by Kickbox.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sandbox: ctx.config.sandbox });

    let result = await client.getBatchStatus(ctx.input.batchId);

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
      progress: result.progress,
      details: result
    };

    let messageParts = [`Batch **${result.id}** is **${result.status}**.`];
    if (result.total !== undefined && result.total > 0) {
      messageParts.push(`Total: ${result.total} emails.`);
    }
    if (result.sendex !== undefined && result.sendex > 0) {
      messageParts.push(`Average Sendex score: **${result.sendex}**.`);
    }
    if (result.download_url) {
      await ctx.addAttachment({ type: 'url', url: result.download_url, mimeType: 'text/csv' });
      messageParts.push(`[Download results](${result.download_url})`);
    }

    return {
      output,
      message: messageParts.join(' ')
    };
  })
  .build();
