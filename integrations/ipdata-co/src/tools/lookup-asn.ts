import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseResponse } from '../lib/schemas';
import { spec } from '../spec';

let prefixSchema = z
  .object({
    prefix: z.string().describe('IP prefix (CIDR notation)'),
    ip: z.string().describe('IP address'),
    cidr: z.number().describe('CIDR mask length'),
    asn: z.string().describe('ASN'),
    name: z.string().optional().describe('Prefix name, when supplied by the provider'),
    countryCode: z.string().optional().describe('Country code for the prefix, when supplied')
  })
  .passthrough();

let asnOutputSchema = z.object({
  asn: z.string().describe('Autonomous System Number'),
  name: z.string().describe('AS organization name'),
  domain: z.string().describe('AS organization domain'),
  route: z.string().optional().describe('AS route, when supplied by the provider'),
  type: z.string().describe('Usage type (e.g. isp, hosting, business, education)'),
  countryCode: z.string().optional().describe('Country code'),
  ipv4Prefixes: z.array(z.string()).optional().describe('Original IPv4 CIDR prefixes'),
  ipv6Prefixes: z.array(z.string()).optional().describe('Original IPv6 CIDR prefixes'),
  numIps: z
    .string()
    .optional()
    .describe('Number of IP addresses, as reported by the provider'),
  registry: z.string().optional().describe('ASN registry'),
  date: z.string().optional().describe('ASN assignment date'),
  status: z.string().optional().describe('ASN assignment status'),
  upstream: z.array(z.number()).optional().describe('Upstream AS numbers'),
  downstream: z.array(z.number()).optional().describe('Downstream AS numbers'),
  peers: z.array(z.number()).optional().describe('Peer AS numbers'),
  raw: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Complete original provider response'),
  prefixes: z.array(prefixSchema).describe('Associated IPv4 prefixes'),
  prefixes6: z.array(prefixSchema).describe('Associated IPv6 prefixes')
});

export let lookupAsn = SlateTool.create(spec, {
  name: 'Lookup ASN',
  key: 'lookup_asn',
  description: `Look up detailed information about an Autonomous System Number (ASN). Returns the AS name, organization domain, route, usage type, associated IPv4 and IPv6 prefixes, and country. Pass the ASN in the format "AS{number}" (e.g. "AS13335").`,
  constraints: ['Coverage includes approximately 100K ASNs.', 'Requires a paid API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asn: z.string().describe('Autonomous System Number to look up (e.g. "AS13335", "AS2")')
    })
  )
  .output(asnOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });

    let result = await client.lookupAsn(ctx.input.asn);

    return {
      output: parseResponse(asnOutputSchema, result),
      message: `ASN **${result.asn}** belongs to **${result.name}** (${result.domain}), type: ${result.type}. Has ${result.prefixes.length} IPv4 and ${result.prefixes6.length} IPv6 prefixes.`
    };
  })
  .build();
