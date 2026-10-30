import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetorialClient } from '../lib/client';
import { spec } from '../spec';

export let getInstance = SlateTool.create(spec, {
  name: 'Get Instance',
  key: 'get_instance',
  description:
    'DEPRECATED — use `instance_get` instead. Read the metadata of an accessible Metorial instance, including its project, organization, environment type, and timestamps. Call instance_list to discover an instance ID or slug.',
  instructions: ['Use instance_get instead; this tool is kept for existing workflows.'],
  tags: { readOnly: true, deprecated: true }
})
  .input(
    z.object({
      instanceId: z.string().describe('Metorial instance ID or slug from instance_list.')
    })
  )
  .output(
    z.object({
      instance: z
        .record(z.string(), z.unknown())
        .describe('Complete instance metadata returned by Metorial.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetorialClient();
    let instance = await client.getInstance(ctx.auth.token, ctx.input.instanceId);
    return {
      output: { instance },
      message: 'Retrieved the Metorial instance details.'
    };
  })
  .build();
