import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelTraining = SlateTool.create(spec, {
  name: 'Cancel Training',
  key: 'cancel_training',
  description: `Cancel a running training job. Only trainings in progress (starting or processing) can be canceled.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      trainingId: z.string().describe('ID of the training to cancel')
    })
  )
  .output(
    z.object({
      trainingId: z.string().describe('ID of the canceled training'),
      canceled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelTraining(ctx.input.trainingId);

    return {
      output: {
        trainingId: ctx.input.trainingId,
        canceled: true
      },
      message: `Training **${ctx.input.trainingId}** has been canceled.`
    };
  })
  .build();
