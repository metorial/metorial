import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNodeIps = SlateTool.create(spec, {
  key: 'list_node_ips',
  name: 'List Monitoring IP Addresses',
  description:
    'Get the actual IPv4 and/or IPv6 addresses used by monitoring and webhook servers for firewall allowlists.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      family: z
        .enum(['all', 'ipv4', 'ipv6'])
        .optional()
        .describe('Address family. Omit for all addresses.')
    })
  )
  .output(
    z.object({
      addresses: z
        .array(z.string())
        .describe('Provider monitoring and webhook server IP addresses')
    })
  )
  .handleInvocation(async ctx => {
    let addresses = await new Client({ token: ctx.auth.token }).listNodeIps(ctx.input.family);
    return {
      output: { addresses },
      message: `Found ${addresses.length} server IP address(es).`
    };
  })
  .build();
