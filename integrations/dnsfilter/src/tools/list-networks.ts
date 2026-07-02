import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNetworks = SlateTool.create(spec, {
  name: 'List Networks',
  key: 'list_networks',
  description: `Lists network sites configured in DNSFilter. Optionally filter MSP networks by organization. Returns site details including associated policies, IP addresses, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      msp: z.boolean().optional().describe('If true, list MSP-managed networks'),
      organizationId: z.string().optional().describe('Filter MSP networks by organization ID')
    })
  )
  .output(
    z.object({
      networks: z
        .array(z.record(z.string(), z.any()))
        .describe('List of network (site) objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let networks = await client.listNetworks({
      msp: ctx.input.msp,
      organizationId: ctx.input.organizationId
    });

    return {
      output: { networks },
      message: `Found **${networks.length}** network(s).`
    };
  })
  .build();
