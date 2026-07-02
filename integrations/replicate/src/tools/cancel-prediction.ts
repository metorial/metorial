import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelPrediction = SlateTool.create(spec, {
  name: 'Cancel Prediction',
  key: 'cancel_prediction',
  description: `Cancel a running prediction. Only predictions that are still in progress (starting or processing) can be canceled.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      predictionId: z.string().describe('ID of the prediction to cancel')
    })
  )
  .output(
    z.object({
      predictionId: z.string().describe('ID of the canceled prediction'),
      canceled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelPrediction(ctx.input.predictionId);

    return {
      output: {
        predictionId: ctx.input.predictionId,
        canceled: true
      },
      message: `Prediction **${ctx.input.predictionId}** has been canceled.`
    };
  })
  .build();
