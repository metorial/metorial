import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let ipReputationLookup = SlateTool.create(spec, {
  name: 'IP Reputation Lookup',
  key: 'ip_reputation_lookup',
  description:
    'Retrieve threat intelligence for an IPv4 or IPv6 address, including threat score, Tor, proxy, VPN, and abuse signals, with location and network information.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ ip: z.string().trim().min(1).describe('IPv4 or IPv6 address to assess') }))
  .output(
    z.object({
      reputation: z.any().describe('IP security, location, network, and ASN information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let reputation = await client.ipReputation(ctx.input.ip);
    return {
      output: { reputation },
      message: `Retrieved IP reputation for **${ctx.input.ip}**.`
    };
  })
  .build();
