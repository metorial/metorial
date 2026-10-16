import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { predictionBatchResponseSchema, predictionInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let predictGenderBatchV2 = SlateTool.create(spec, {
  name: 'Predict Gender in a Mixed Batch (V2)',
  key: 'predict_gender_batch_v2',
  description:
    'Estimate gender for up to 50 names, email addresses and usernames in one mixed batch. Preserves each original index, optional record ID, prediction or item error, and request billing metadata. Inspect each item because HTTP success can include failed items.',
  instructions: [
    'Batch items default to AI off. Set aiMode fallback explicitly for AI fallback or forceToGenderize.',
    'Use a distinct id on each item to correlate results with source records.',
    'An unknown prediction is a successful, billable lookup. An item error is returned separately from a prediction.',
    'Inspect meta.usage before retrying; an unconfirmed billing status does not establish that a request was free.'
  ],
  constraints: ['Submit between 1 and 50 items per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      items: z
        .array(
          predictionInputSchema.extend({
            id: z.string().min(1).max(64).optional().describe('Source record ID, echoed back')
          })
        )
        .min(1)
        .max(50)
    })
  )
  .output(predictionBatchResponseSchema)
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).predictGenderBatch(
      ctx.input.items
    );
    return {
      output,
      message: `Received ${output.data.length} batch outcomes. Request ID: ${output.meta.request_id}. Inspect each item for a prediction or error.`
    };
  })
  .build();
