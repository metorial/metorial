import { batchInputSchema } from '@slates/microsoft-dataverse-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../lib/client';
import { spec } from '../spec';

export let executeBatch = SlateTool.create(spec, {
  name: 'Execute Batch Request',
  key: 'execute_batch',
  description:
    'Execute multiple relative Dataverse Web API operations in one $batch request. Write operations are grouped into a changeset by Dataverse recipe helpers.',
  instructions: [
    'Use relative Dataverse Web API URLs such as "accounts?$select=name" or "accounts(<guid>)".',
    'Batch responses are returned as the raw Dataverse batch response payload.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(batchInputSchema)
  .output(
    z.object({
      operationCount: z.number().describe('Number of operations submitted'),
      result: z.any().describe('Raw Dataverse batch response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let result = await client.executeBatch(ctx.input.operations);

    return {
      output: {
        operationCount: ctx.input.operations.length,
        result
      },
      message: `Executed Dataverse batch with **${ctx.input.operations.length}** operations.`
    };
  })
  .build();
