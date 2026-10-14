import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let finishBatchVerification = SlateTool.create(spec, {
  name: 'Finish Batch Verification',
  key: 'finish_batch_verification',
  description:
    'Request that a running verification batch finish early. Bouncer returns credits for emails that have not been verified. Processing finishes asynchronously; completed results remain available for download.',
  instructions: [
    'Use get_batch_status to wait for completed status before calling get_batch_results.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      batchId: z.string().describe('Batch ID returned by create_batch_verification')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Batch identifier'),
      finishRequested: z.boolean().describe('Whether Bouncer accepted the finish request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.finishBatch(ctx.input.batchId);

    return {
      output: { batchId: ctx.input.batchId, finishRequested: true },
      message: `Requested early finish for batch **${ctx.input.batchId}**. Check its status before downloading results.`
    };
  })
  .build();
