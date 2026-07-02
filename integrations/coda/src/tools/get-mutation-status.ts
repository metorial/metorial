import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMutationStatusTool = SlateTool.create(spec, {
  name: 'Get Mutation Status',
  key: 'get_mutation_status',
  description: `Check the completion status of an asynchronous write operation using the request ID returned from mutation endpoints (row inserts, updates, deletes, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('Request ID returned from a mutation operation')
    })
  )
  .output(
    z.object({
      completed: z.boolean().describe('Whether the mutation has completed'),
      warning: z.string().optional().describe('Any warning message about the mutation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMutationStatus(ctx.input.requestId);

    return {
      output: {
        completed: result.completed,
        warning: result.warning
      },
      message: result.completed
        ? `Mutation **${ctx.input.requestId}** has **completed**.${result.warning ? ` Warning: ${result.warning}` : ''}`
        : `Mutation **${ctx.input.requestId}** is still **in progress**.`
    };
  })
  .build();
