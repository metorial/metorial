import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyBatch = SlateTool.create(spec, {
  name: 'Verify Email Batch',
  key: 'verify_batch',
  description: `Submit a batch of email addresses for bulk verification. Returns a batch ID that can be used to check the status and retrieve results later using the **Get Batch Status** tool. Optionally provide a callback URL to receive results via HTTP POST when the batch completes.`,
  instructions: [
    'Use the Get Batch Status tool to check progress and retrieve results after submitting a batch.',
    'For batches up to 1,000 emails, individual results are returned inline. For larger batches, a downloadable CSV file is provided.'
  ],
  constraints: [
    'Maximum of 50,000 emails per batch.',
    'Rate limited to 5 requests/second on standard plans.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .min(1)
        .max(50000)
        .describe('List of email addresses to verify'),
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'URL to receive results via HTTP POST when the batch completes. Must return HTTP 200; retries hourly for up to 3 days on failure.'
        ),
      responseFields: z
        .array(z.string())
        .optional()
        .describe(
          'Limit which fields are returned in results (e.g. ["email", "state", "score"])'
        ),
      retries: z
        .boolean()
        .optional()
        .describe(
          'Whether to retry failed verifications. Defaults to true. Disabling speeds up verification.'
        )
    })
  )
  .output(
    z.object({
      batchId: z
        .string()
        .describe(
          'Unique identifier for the batch, used to check status and retrieve results'
        ),
      message: z.string().describe('Confirmation message from the server')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBatch({
      emails: ctx.input.emails,
      callbackUrl: ctx.input.callbackUrl,
      responseFields: ctx.input.responseFields,
      retries: ctx.input.retries
    });

    return {
      output: result,
      message: `Batch **${result.batchId}** created with **${ctx.input.emails.length}** emails. ${result.message}`
    };
  })
  .build();
