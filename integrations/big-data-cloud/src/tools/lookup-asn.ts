import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let asnPeerSchema = z
  .object({
    asn: z.string().optional().describe('Autonomous System Number'),
    asnNumeric: z.number().optional(),
    organisation: z.string().optional(),
    name: z.string().optional(),
    registeredCountry: z.string().optional(),
    totalIpv4Addresses: z.number().optional()
  })
  .passthrough();

export let lookupAsnTool = SlateTool.create(spec, {
  name: 'Lookup ASN',
  key: 'lookup_asn',
  description: `Look up comprehensive ownership, connectivity, and geographic information for an Autonomous System Number (ASN). Returns registration details, receiving/transit peer lists, and the most active geographic area for the ASN.`,
  instructions: [
    'Provide the ASN in numeric or "AS" prefix format (e.g. "13335" or "AS13335").',
    'The limit parameter caps the number of receivingFrom and transitTo entries (default and max: 50).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asn: z.string().describe('Autonomous System Number (e.g. "13335" or "AS13335")'),
      limit: z
        .number()
        .optional()
        .describe('Max number of peer entries to return (default: 50, max: 50)')
    })
  )
  .output(
    z
      .object({
        asn: z.string().optional().describe('ASN string'),
        asnNumeric: z.number().optional().describe('ASN as a number'),
        organisation: z.string().optional().describe('Registered organisation'),
        name: z.string().optional().describe('Registered name'),
        registry: z
          .string()
          .optional()
          .describe('Regional Internet Registry (e.g. ARIN, RIPE)'),
        registeredCountry: z
          .string()
          .optional()
          .describe('Registered country ISO Alpha-2 code'),
        registeredCountryName: z
          .string()
          .optional()
          .describe('Localised registered country name'),
        registrationDate: z.string().optional().describe('Registration date (yyyy-mm-dd)'),
        registrationLastChange: z
          .string()
          .optional()
          .describe('Last modification date (yyyy-mm-dd)'),
        totalIpv4Addresses: z.number().optional().describe('Total IPv4 addresses announced'),
        totalIpv4Prefixes: z.number().optional().describe('Total IPv4 BGP prefixes announced'),
        receivingFrom: z
          .array(asnPeerSchema)
          .optional()
          .describe('Autonomous Systems sending traffic to this ASN'),
        transitTo: z
          .array(asnPeerSchema)
          .optional()
          .describe('Autonomous Systems receiving traffic from this ASN'),
        mostActiveArea: z
          .array(
            z
              .object({
                latitude: z.number().optional(),
                longitude: z.number().optional()
              })
              .passthrough()
          )
          .optional()
          .describe('Geographic polygon of most active region')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.asnInfo({
      asn: ctx.input.asn,
      limit: ctx.input.limit
    });

    let asnStr = result.asn || ctx.input.asn;
    let org = result.organisation || result.name || 'unknown';
    let country = result.registeredCountryName || result.registeredCountry || '';
    let ipCount =
      result.totalIpv4Addresses != null ? result.totalIpv4Addresses.toLocaleString() : 'N/A';

    return {
      output: result,
      message: `**${asnStr}** (${org}${country ? `, ${country}` : ''}): ${ipCount} IPv4 addresses.`
    };
  })
  .build();
