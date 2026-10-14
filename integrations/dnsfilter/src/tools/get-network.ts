import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNetwork = SlateTool.create(spec, {
  name: 'Get Network',
  key: 'get_network',
  description:
    'Retrieve a network site, its filtering configuration, and related resource IDs. Call list_networks to discover network IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      networkId: z.string().describe('Network ID. Call list_networks to discover network IDs.')
    })
  )
  .output(
    z.object({
      network: z.record(z.string(), z.any()).describe('Network details and relationships')
    })
  )
  .handleInvocation(async ctx => {
    let network = await new Client(ctx.auth.token).getNetwork(ctx.input.networkId);
    return { output: { network }, message: `Retrieved network **${ctx.input.networkId}**.` };
  })
  .build();
