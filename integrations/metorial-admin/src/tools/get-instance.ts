import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import { spec } from '../spec';

export let getInstance = SlateTool.create(spec, {
  name: 'Get Instance',
  key: 'get_instance',
  description:
    'Read the metadata of an accessible Metorial instance, including its project, organization, environment type, and timestamps. Call list_instances to discover an instance ID or slug.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      instanceId: z.string().describe('Metorial instance ID or slug from list_instances.')
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
    let client = new MetorialClient(resolveMetorialRuntimeConfig(ctx.config, ctx.auth));
    let instance = await client.getInstance(ctx.auth.token, ctx.input.instanceId);
    return {
      output: { instance },
      message: 'Retrieved the Metorial instance details.'
    };
  })
  .build();
