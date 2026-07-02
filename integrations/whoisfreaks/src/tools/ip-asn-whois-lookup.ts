import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let ipAsnWhoisLookup = SlateTool.create(spec, {
  name: 'IP & ASN WHOIS Lookup',
  key: 'ip_asn_whois_lookup',
  description: `Look up WHOIS registration data for an IP address or Autonomous System Number (ASN). For IPs, returns registration data, contact details, routes, and network information. For ASNs, returns ownership, network infrastructure, organization details, and associated IP ranges.`,
  instructions: [
    'Provide either an IP address or an ASN, not both.',
    'ASN should be in the format "AS12345" or just the number.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().optional().describe('IPv4 or IPv6 address to look up'),
      asn: z
        .string()
        .optional()
        .describe('Autonomous System Number to look up (e.g. "AS15169" or "15169")')
    })
  )
  .output(
    z.object({
      whoisData: z
        .any()
        .describe('WHOIS registration and network data for the queried IP or ASN')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (ctx.input.ip) {
      let result = await client.ipWhoisLookup(ctx.input.ip);
      return {
        output: { whoisData: result },
        message: `Retrieved IP WHOIS data for **${ctx.input.ip}**.`
      };
    }

    if (ctx.input.asn) {
      let result = await client.asnWhoisLookup(ctx.input.asn);
      return {
        output: { whoisData: result },
        message: `Retrieved ASN WHOIS data for **${ctx.input.asn}**.`
      };
    }

    throw new Error('Either ip or asn must be provided.');
  })
  .build();
