import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupIpLite = SlateTool.create(spec, {
  name: 'Lookup IP (Lite)',
  key: 'lookup_ip_lite',
  description: `Quick country-level geolocation and basic ASN lookup for an IP address using the free Lite API tier. Returns country, continent, and ASN information. Omit the IP to look up the caller's own address.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z
        .string()
        .optional()
        .describe(
          "IPv4 or IPv6 address to look up. Omit to look up the caller's own IP address."
        )
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The queried IP address'),
      asn: z.string().optional().describe('Autonomous System Number (e.g. AS15169)'),
      asName: z.string().optional().describe('AS organization name'),
      asDomain: z.string().optional().describe('AS organization domain'),
      countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      country: z.string().optional().describe('Full country name'),
      continentCode: z.string().optional().describe('Two-letter continent code'),
      continent: z.string().optional().describe('Full continent name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getLiteIpDetails(ctx.input.ip);

    let output = {
      ip: result.ip,
      asn: result.asn,
      asName: result.as_name,
      asDomain: result.as_domain,
      countryCode: result.country_code,
      country: result.country,
      continentCode: result.continent_code,
      continent: result.continent
    };

    return {
      output,
      message: `IP **${result.ip}** is in **${result.country || result.country_code || 'unknown'}** (${result.continent || 'unknown continent'})${result.as_name ? `, operated by ${result.as_name}` : ''}.`
    };
  })
  .build();
