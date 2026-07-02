import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkValidateEmails = SlateTool.create(spec, {
  name: 'Bulk Validate Emails',
  key: 'bulk_validate_emails',
  description: `Submit a list of email addresses for bulk validation. This starts an asynchronous batch job and returns the batch ID, which can be used to poll for results using the **Get Bulk Validation Results** tool. Requires a paid Mails.so subscription.`,
  constraints: [
    'Bulk validation requires a paid Mails.so subscription.',
    'Processing is asynchronous — use the returned batch ID to poll for results.'
  ]
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to validate')
    })
  )
  .output(
    z.object({
      batchId: z
        .string()
        .describe('Unique identifier for the batch job, used to retrieve results'),
      createdAt: z.string().describe('Timestamp when the batch was created'),
      size: z.number().describe('Number of emails submitted in the batch'),
      isFinished: z.boolean().describe('Whether the batch job has completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.createBatch(ctx.input.emails);

    return {
      output: {
        batchId: response.id,
        createdAt: response.created_at,
        size: response.size,
        isFinished: response.finished_at !== null
      },
      message: `Batch job **${response.id}** created with **${response.size}** emails. Poll for results using the batch ID.`
    };
  })
  .build();
