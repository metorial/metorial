import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBatchVerification = SlateTool.create(spec, {
  name: 'Create Batch Verification',
  key: 'create_batch_verification',
  description: `Submit a list of email addresses for asynchronous batch verification. Returns a batch ID that can be used to check status and download results later. This is the recommended approach for large email lists where the highest verification quality is needed, as Bouncer's distributed infrastructure retries verifications when required.`,
  instructions: [
    'Use the **Get Batch Status** tool to poll for completion, or provide a callback URL to be notified.',
    'Use the **Get Batch Results** tool to download results once the batch is completed.'
  ],
  constraints: [
    'Maximum 100,000 emails per batch (recommended 1,000–10,000).',
    'Up to 60 batches can be created per minute.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to verify'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL where Bouncer will POST when processing is complete')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier for the batch verification job'),
      created: z.string().describe('ISO 8601 timestamp of when the batch was created'),
      status: z.string().describe('Current batch status (e.g. queued)'),
      quantity: z.number().describe('Number of emails submitted'),
      duplicates: z.number().describe('Number of duplicate emails removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let emailObjects = ctx.input.emails.map(email => ({ email }));
    let result = await client.createBatch(emailObjects, ctx.input.callbackUrl);

    return {
      output: result,
      message: `Created batch **${result.batchId}** with **${result.quantity}** emails (${result.duplicates} duplicates removed). Status: **${result.status}**`
    };
  })
  .build();
