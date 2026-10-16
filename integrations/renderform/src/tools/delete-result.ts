import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteResult = SlateTool.create(spec, {
  key: 'delete_result',
  name: 'Delete Render Result',
  description: 'Delete an existing rendered file by its result identifier.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({ resultId: z.string().describe('Identifier from list_results or get_result') })
  )
  .output(z.object({ resultId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth.token).deleteResult(ctx.input.resultId);
    return {
      output: { resultId: ctx.input.resultId, deleted: true },
      message: `Deleted render result ${ctx.input.resultId}.`
    };
  })
  .build();
