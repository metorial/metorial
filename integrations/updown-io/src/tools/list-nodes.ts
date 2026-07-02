import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { nodeSchema } from '../lib/types';
import { spec } from '../spec';

export let listNodes = SlateTool.create(spec, {
  name: 'List Monitoring Nodes',
  key: 'list_nodes',
  description: `List all Updown.io monitoring server locations with their IP addresses (IPv4 and IPv6), geographic coordinates, and city/country information. Useful for firewall whitelisting or understanding monitoring coverage.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      nodes: z.array(nodeSchema).describe('List of monitoring server locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let nodes = await client.listNodes();

    return {
      output: { nodes },
      message: `Found **${nodes.length}** monitoring node(s) across ${[...new Set(nodes.map(n => n.country))].length} countries.`
    };
  })
  .build();
