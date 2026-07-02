import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retryGeneration = SlateTool.create(spec, {
  name: 'Retry Generation',
  key: 'retry_generation',
  description: `Retry a failed image generation. If a generation ended in error, this restarts it. You may want to update the prompt first using the "Update Generation" tool before retrying.`,
  constraints: ['Only generations with error status can be retried.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      generationId: z.string().describe('ID of the failed generation to retry')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('ID of the retried generation'),
      retried: z.boolean().describe('Whether the retry was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.retryGeneration(ctx.input.generationId);

    return {
      output: {
        generationId: ctx.input.generationId,
        retried: true
      },
      message: `Generation \`${ctx.input.generationId}\` has been restarted. Check its status to track progress.`
    };
  })
  .build();
