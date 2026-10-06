import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInstanceTool = SlateTool.create(spec, {
  name: 'Get Instance',
  key: 'get_instance',
  description:
    'DEPRECATED — use `list_instances` instead. Legacy Reporting API v1 instance metadata.',
  instructions: [
    'Use list_instances with Reporting API v2 credentials for current reporting.'
  ],
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        communityId: z.string().describe('Unique identifier of the Later Influence community'),
        communityName: z.string().describe('Name of the Later Influence community')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let instance = await client.getInstance();

    return {
      output: instance,
      message: 'Retrieved legacy instance metadata.'
    };
  })
  .build();
