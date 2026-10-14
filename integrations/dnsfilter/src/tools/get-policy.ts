import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPolicy = SlateTool.create(spec, {
  name: 'Get Policy',
  key: 'get_policy',
  description:
    'Retrieve a filtering policy and its configured allow lists, block lists, categories, applications, and relationships. Call list_policies to discover policy IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      policyId: z.string().describe('Policy ID. Call list_policies to discover policy IDs.')
    })
  )
  .output(
    z.object({
      policy: z.record(z.string(), z.any()).describe('Policy configuration and relationships')
    })
  )
  .handleInvocation(async ctx => {
    let policy = await new Client(ctx.auth.token).getPolicy(ctx.input.policyId);
    return { output: { policy }, message: `Retrieved policy **${ctx.input.policyId}**.` };
  })
  .build();
