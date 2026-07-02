import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteFunction = SlateTool.create(spec, {
  name: 'Delete Function',
  key: 'delete_function',
  description: `Permanently delete a Cloud Function. This removes the function and all its associated resources. Returns a long-running operation that can be polled for completion.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.deleteFunction)
  .input(
    z.object({
      functionName: z
        .string()
        .describe('Short function name or fully qualified resource name'),
      location: z
        .string()
        .optional()
        .describe(
          'Region where the function is deployed. Only needed with short function names.'
        )
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Long-running operation name to poll for completion'),
      done: z.boolean().describe('Whether the deletion completed immediately')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    ctx.progress(`Deleting function **${ctx.input.functionName}**...`);

    let operation: any;
    if (ctx.input.functionName.startsWith('projects/')) {
      operation = await client.deleteFunction(ctx.input.functionName);
    } else {
      operation = await client.deleteFunctionByName(
        ctx.input.functionName,
        ctx.input.location
      );
    }

    return {
      output: {
        operationName: operation.name,
        done: operation.done || false
      },
      message: `Deletion of **${ctx.input.functionName}** initiated. ${operation.done ? 'Function deleted.' : 'Deletion in progress - poll the operation for status.'}`
    };
  })
  .build();
