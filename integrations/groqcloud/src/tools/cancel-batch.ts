import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelBatch = SlateTool.create(spec, {
  name: 'Cancel Batch',
  key: 'cancel_batch',
  description: `Cancel an in-progress batch processing job on GroqCloud. The batch status will transition to "cancelling" and then "cancelled".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch job to cancel')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch'),
      status: z.string().describe('Updated status of the batch (typically "cancelling")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let batch = await client.cancelBatch(ctx.input.batchId);

    return {
      output: {
        batchId: batch.id,
        status: batch.status
      },
      message: `Batch **${batch.id}** cancellation requested. Status: **${batch.status}**.`
    };
  })
  .build();
