import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';
import { endpointSchema, mapEndpoint } from './shared';

export let getEndpoint = SlateTool.create(spec, {
  name: 'Get Endpoint',
  key: 'get_endpoint',
  description: `Retrieves details for a specific Neon compute endpoint, including state, host, autoscaling limits, suspend timeout, and access flags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      endpointId: z.string().describe('ID of the endpoint to retrieve')
    })
  )
  .output(endpointSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getEndpoint(ctx.input.projectId, ctx.input.endpointId);
    let endpoint = mapEndpoint(result.endpoint);

    return {
      output: endpoint,
      message: `Retrieved endpoint **${endpoint.endpointId}** (${endpoint.currentState ?? 'unknown state'}).`
    };
  })
  .build();
