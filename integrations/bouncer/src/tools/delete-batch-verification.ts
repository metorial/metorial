import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteBatchVerification = SlateTool.create(spec, {
  name: 'Delete Batch Verification',
  key: 'delete_batch_verification',
  description:
    'Delete the emails and results associated with a verification batch. Deleted results cannot be downloaded again. Bouncer rejects deletion when the batch is in an incompatible state.',
  instructions: [
    'Download any results you need with get_batch_results before deleting the batch.'
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
      batchId: z.string().describe('Deleted batch identifier'),
      deleted: z.boolean().describe('Whether Bouncer confirmed deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteBatch(ctx.input.batchId);

    return {
      output: { batchId: ctx.input.batchId, deleted: true },
      message: `Deleted emails and results for batch **${ctx.input.batchId}**.`
    };
  })
  .build();
