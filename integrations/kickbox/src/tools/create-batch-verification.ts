import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBatchVerification = SlateTool.create(spec, {
  name: 'Create Batch Verification',
  key: 'create_batch_verification',
  description: `Submit a batch of email addresses for verification. Returns a batch job ID that can be used to check the status and retrieve results later using the **Check Batch Verification Status** tool. Supports up to 1 million email addresses per batch.`,
  constraints: ['Maximum of 1,000,000 email addresses per batch.'],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to verify.'),
      filename: z
        .string()
        .optional()
        .describe('Optional name for the batch job, useful for identification.')
    })
  )
  .output(
    z.object({
      batchId: z.number().describe('The unique identifier for the batch verification job.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBatchVerification(ctx.input.emails, ctx.input.filename);

    if (!result.success) {
      throw new Error(result.message || 'Failed to create batch verification job.');
    }

    return {
      output: {
        batchId: result.id
      },
      message: `Batch verification job created with ID **${result.id}** for **${ctx.input.emails.length}** email addresses.`
    };
  })
  .build();
