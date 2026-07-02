import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getOperation = SlateTool.create(spec, {
  name: 'Get Operation',
  key: 'get_operation',
  description: `Check the status of a long-running operation such as function creation, update, or deletion. Provides the current state and any error or success details.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.getOperation)
  .input(
    z.object({
      operationName: z
        .string()
        .describe(
          'Full operation name returned by create, update, or delete operations (e.g. "projects/my-project/locations/us-central1/operations/abc123")'
        )
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Operation resource name'),
      done: z.boolean().describe('Whether the operation has completed'),
      error: z
        .object({
          code: z.number().optional(),
          message: z.string().optional()
        })
        .optional()
        .describe('Error details if the operation failed'),
      metadata: z.any().optional().describe('Operation metadata with progress details'),
      response: z.any().optional().describe('The result if the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let operation = await client.getOperation(ctx.input.operationName);

    let statusMessage: string;
    if (operation.done && operation.error) {
      statusMessage = `Operation **failed**: ${operation.error.message || 'Unknown error'}`;
    } else if (operation.done) {
      statusMessage = `Operation **completed** successfully.`;
    } else {
      statusMessage = `Operation is **in progress**.`;
    }

    return {
      output: {
        operationName: operation.name,
        done: operation.done || false,
        error: operation.error,
        metadata: operation.metadata,
        response: operation.response
      },
      message: statusMessage
    };
  })
  .build();
