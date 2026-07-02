import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let probeSchema = z.object({
  version: z.string().optional().describe('Probe software version'),
  location: z
    .object({
      continent: z.string().describe('Continent code'),
      region: z.string().describe('Geographic region'),
      country: z.string().describe('ISO 3166-1 alpha-2 country code'),
      state: z.string().nullable().optional().describe('US state code'),
      city: z.string().describe('City name'),
      asn: z.number().describe('Autonomous System Number'),
      network: z.string().describe('Network/ISP name'),
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude')
    })
    .describe('Probe geographic location'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Probe tags (e.g. cloud region codes, datacenter-network, eyeball-network)'),
  resolvers: z.array(z.string()).optional().describe('Configured DNS resolvers')
});

export let listProbes = SlateTool.create(spec, {
  name: 'List Probes',
  key: 'list_probes',
  description: `List all currently online Globalping probes with their location and network metadata. Optionally filter results by country, continent, city, ASN, network name, or tags to find probes in specific locations.

Returns probe details including geographic location, network information, and tags for targeted testing.`,
  instructions: [
    'Use filters to narrow down the large list of probes to a specific region or network.',
    'Tags include cloud region identifiers (e.g. "aws-eu-west-1") and network type tags ("datacenter-network", "eyeball-network").'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      continent: z
        .enum(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'])
        .optional()
        .describe('Filter by continent code'),
      country: z
        .string()
        .optional()
        .describe('Filter by ISO 3166-1 alpha-2 country code (e.g. "US", "DE")'),
      city: z
        .string()
        .optional()
        .describe('Filter by city name (case-insensitive partial match)'),
      asn: z.number().optional().describe('Filter by Autonomous System Number'),
      network: z
        .string()
        .optional()
        .describe('Filter by network/ISP name (case-insensitive partial match)'),
      tag: z
        .string()
        .optional()
        .describe('Filter by tag (e.g. "datacenter-network", "aws-us-east-1")'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe('Maximum number of probes to return (default: 100)')
    })
  )
  .output(
    z.object({
      probes: z.array(probeSchema).describe('List of matching online probes'),
      totalReturned: z.number().describe('Number of probes returned'),
      totalOnline: z.number().describe('Total number of online probes before filtering')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let allProbes = (await client.listProbes()) as Array<{
      version?: string;
      location: {
        continent: string;
        region: string;
        country: string;
        state?: string | null;
        city: string;
        asn: number;
        network: string;
        latitude: number;
        longitude: number;
      };
      tags?: string[];
      resolvers?: string[];
    }>;

    let totalOnline = allProbes.length;
    let filtered = allProbes;

    if (ctx.input.continent) {
      filtered = filtered.filter(p => p.location.continent === ctx.input.continent);
    }

    if (ctx.input.country) {
      let countryUpper = ctx.input.country.toUpperCase();
      filtered = filtered.filter(p => p.location.country === countryUpper);
    }

    if (ctx.input.city) {
      let cityLower = ctx.input.city.toLowerCase();
      filtered = filtered.filter(p => p.location.city.toLowerCase().includes(cityLower));
    }

    if (ctx.input.asn) {
      filtered = filtered.filter(p => p.location.asn === ctx.input.asn);
    }

    if (ctx.input.network) {
      let networkLower = ctx.input.network.toLowerCase();
      filtered = filtered.filter(p => p.location.network.toLowerCase().includes(networkLower));
    }

    if (ctx.input.tag) {
      let tagLower = ctx.input.tag.toLowerCase();
      filtered = filtered.filter(p => p.tags?.some(t => t.toLowerCase().includes(tagLower)));
    }

    let limitedProbes = filtered.slice(0, ctx.input.limit ?? 100);

    return {
      output: {
        probes: limitedProbes,
        totalReturned: limitedProbes.length,
        totalOnline
      },
      message: `Found **${limitedProbes.length}** probe(s) matching filters (${totalOnline} total online). ${filtered.length > limitedProbes.length ? `Showing first ${limitedProbes.length} of ${filtered.length} matches.` : ''}`
    };
  })
  .build();
