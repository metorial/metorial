import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prefixSchema = z
  .object({
    prefix: z.string().describe('IP prefix (CIDR notation)'),
    ip: z.string().describe('IP address'),
    cidr: z.number().describe('CIDR mask length'),
    asn: z.string().describe('ASN'),
    name: z.string().describe('Prefix name'),
    countryCode: z.string().describe('Country code for the prefix')
  })
  .passthrough();

export let lookupAsn = SlateTool.create(spec, {
  name: 'Lookup ASN',
  key: 'lookup_asn',
  description: `Look up detailed information about an Autonomous System Number (ASN). Returns the AS name, organization domain, route, usage type, associated IPv4 and IPv6 prefixes, and country. Pass the ASN in the format "AS{number}" (e.g. "AS13335").`,
  constraints: ['Coverage includes approximately 100K ASNs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asn: z.string().describe('Autonomous System Number to look up (e.g. "AS13335", "AS2")')
    })
  )
  .output(
    z.object({
      asn: z.string().describe('Autonomous System Number'),
      name: z.string().describe('AS organization name'),
      domain: z.string().describe('AS organization domain'),
      route: z.string().describe('AS route'),
      type: z.string().describe('Usage type (e.g. isp, hosting, business, education)'),
      countryCode: z.string().optional().describe('Country code'),
      prefixes: z.array(prefixSchema).describe('Associated IPv4 prefixes'),
      prefixes6: z.array(prefixSchema).describe('Associated IPv6 prefixes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });

    let result = await client.lookupAsn(ctx.input.asn);

    return {
      output: {
        asn: result.asn,
        name: result.name,
        domain: result.domain,
        route: result.route,
        type: result.type,
        countryCode: result.countryCode as string | undefined,
        prefixes: result.prefixes ?? [],
        prefixes6: result.prefixes6 ?? []
      },
      message: `ASN **${result.asn}** belongs to **${result.name}** (${result.domain}), type: ${result.type}. Has ${(result.prefixes ?? []).length} IPv4 and ${(result.prefixes6 ?? []).length} IPv6 prefixes.`
    };
  })
  .build();
