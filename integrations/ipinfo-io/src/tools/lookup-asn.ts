import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prefixSchema = z.object({
  netblock: z.string().describe('CIDR notation of the prefix'),
  id: z.string().describe('Network identifier'),
  name: z.string().describe('Organization name'),
  country: z.string().describe('Country code')
});

export let lookupAsn = SlateTool.create(spec, {
  name: 'Lookup ASN',
  key: 'lookup_asn',
  description: `Look up details for an Autonomous System Number (ASN), including the organization name, assigned IPv4/IPv6 prefixes, registration date, registry, domain, and IP count. Accepts ASN in formats like "AS15169" or "15169".`,
  constraints: ['Available on Core tier and above.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      asn: z.string().describe('Autonomous System Number, e.g. "AS15169" or "15169"')
    })
  )
  .output(
    z.object({
      asn: z.string().describe('ASN in AS-prefixed format (e.g. AS15169)'),
      name: z.string().describe('Organization name'),
      country: z.string().describe('Country code where the ASN is registered'),
      allocated: z.string().optional().describe('Date the ASN was allocated (YYYY-MM-DD)'),
      registry: z
        .string()
        .optional()
        .describe('Regional Internet Registry (arin, ripencc, apnic, lacnic, afrinic)'),
      domain: z.string().optional().describe('Primary domain associated with the ASN'),
      numIps: z.number().optional().describe('Total number of IP addresses'),
      type: z
        .string()
        .optional()
        .describe('ASN type (isp, hosting, business, education, government)'),
      prefixes: z.array(prefixSchema).optional().describe('IPv4 prefix list'),
      prefixes6: z.array(prefixSchema).optional().describe('IPv6 prefix list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getAsnDetails(ctx.input.asn);

    let output = {
      asn: result.asn,
      name: result.name,
      country: result.country,
      allocated: result.allocated,
      registry: result.registry,
      domain: result.domain,
      numIps: result.num_ips,
      type: result.type,
      prefixes: result.prefixes,
      prefixes6: result.prefixes6
    };

    let prefixCount = (result.prefixes?.length || 0) + (result.prefixes6?.length || 0);
    return {
      output,
      message: `**${result.asn}** belongs to **${result.name}** (${result.country})${result.type ? `, type: ${result.type}` : ''}${result.num_ips ? `, ${result.num_ips.toLocaleString()} IPs` : ''}, ${prefixCount} prefix(es).`
    };
  })
  .build();
