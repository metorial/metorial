import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let deleteEndpoint = SlateTool.create(spec, {
  name: 'Delete Endpoint',
  key: 'delete_endpoint',
  description: `Permanently delete a Serverless endpoint. This terminates all associated workers and removes the endpoint configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      endpointId: z.string().describe('ID of the endpoint to delete')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('ID of the deleted endpoint'),
      success: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    await client.deleteEndpoint(ctx.input.endpointId);

    return {
      output: {
        endpointId: ctx.input.endpointId,
        success: true
      },
      message: `Deleted endpoint **${ctx.input.endpointId}**.`
    };
  })
  .build();
