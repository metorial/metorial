import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInstanceTool = SlateTool.create(spec, {
  name: 'Get Instance',
  key: 'get_instance',
  description: `Retrieve metadata about the Later Influence community (instance) associated with your credentials. Use this to confirm which program your credentials are linked to before pulling campaign data.`,
  tags: {
    readOnly: true
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
    let client = new Client({ token: ctx.auth.token });
    let instance = await client.getInstance();

    return {
      output: instance as any,
      message: `Retrieved instance information for community **${instance.communityName || instance.communityId}**.`
    };
  })
  .build();
