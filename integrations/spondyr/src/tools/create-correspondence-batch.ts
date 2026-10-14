import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let createCorrespondenceBatch = SlateTool.create(spec, {
  name: 'Create Correspondence Batch',
  key: 'create_correspondence_batch',
  description:
    'Generate and optionally deliver multiple correspondence requests for one event type. Shared data is merged with each transaction. Returns a batch reference ID for tracking processing.',
  instructions: [
    'Call list_transaction_types with a transactionType to discover event types.',
    'Each transaction, combined with sharedData when supplied, must match the transaction type data model.',
    'Set generateOnly to true to defer delivery. Use get_batch_status to monitor the batch.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      eventType: z.string().describe('Event type name discovered with list_transaction_types'),
      generateOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('Generate correspondence without delivering it'),
      transactionData: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .describe('Transaction objects to process, one correspondence request per item'),
      sharedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Data combined with each transaction object before processing')
    })
  )
  .output(
    z.object({
      referenceId: z.string().describe('Batch reference ID to use with get_batch_status'),
      apiStatus: z.string().describe('API request result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient(ctx.auth);
    let result = await client.createBatch(ctx.input);
    return {
      output: result,
      message: `Submitted **${ctx.input.transactionData.length}** correspondence request(s). Batch reference ID: **${result.referenceId}**.`
    };
  })
  .build();
