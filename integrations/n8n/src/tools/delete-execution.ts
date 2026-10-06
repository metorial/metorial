import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let deleteExecution = SlateTool.create(spec, {
  name: 'Delete Execution',
  key: 'delete_execution',
  description: `Permanently delete a workflow execution record. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      executionId: z.string().describe('ID of the execution to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    await client.deleteExecution(ctx.input.executionId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted execution **${ctx.input.executionId}**.`
    };
  })
  .build();
