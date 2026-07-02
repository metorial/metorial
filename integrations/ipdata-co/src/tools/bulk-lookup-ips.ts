import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ipResultSchema = z
  .object({
    ip: z.string().describe('The looked-up IP address'),
    isEu: z.boolean().optional().describe('Whether the IP is in an EU country'),
    city: z.string().optional().describe('City name'),
    region: z.string().optional().describe('Region or state name'),
    regionCode: z.string().optional().describe('Region code'),
    countryName: z.string().optional().describe('Country name'),
    countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
    continentName: z.string().optional().describe('Continent name'),
    continentCode: z.string().optional().describe('Continent code'),
    latitude: z.number().optional().describe('Latitude coordinate'),
    longitude: z.number().optional().describe('Longitude coordinate'),
    postalCode: z.string().optional().describe('Postal or ZIP code'),
    callingCode: z.string().optional().describe('International calling code'),
    asn: z
      .object({
        asn: z.string().describe('Autonomous System Number'),
        name: z.string().describe('AS organization name'),
        domain: z.string().describe('AS organization domain'),
        route: z.string().describe('AS route'),
        type: z.string().describe('Usage type')
      })
      .optional(),
    threat: z
      .object({
        isTor: z.boolean().describe('Known Tor exit node'),
        isProxy: z.boolean().describe('Known proxy'),
        isAnonymous: z.boolean().describe('Anonymous access'),
        isKnownAttacker: z.boolean().describe('Known attacker'),
        isKnownAbuser: z.boolean().describe('Known abuser'),
        isThreat: z.boolean().describe('Considered a threat'),
        isBogon: z.boolean().describe('Bogon address')
      })
      .optional(),
    company: z
      .object({
        name: z.string().describe('Company name'),
        domain: z.string().describe('Company domain'),
        type: z.string().describe('Organization type')
      })
      .optional(),
    timezone: z
      .object({
        name: z.string().describe('IANA timezone name'),
        abbr: z.string().describe('Timezone abbreviation'),
        offset: z.string().describe('UTC offset'),
        isDst: z.boolean().describe('Daylight saving time active'),
        currentTime: z.string().describe('Current time in timezone')
      })
      .optional(),
    currency: z
      .object({
        name: z.string().describe('Currency name'),
        code: z.string().describe('ISO 4217 currency code'),
        symbol: z.string().describe('Currency symbol'),
        native: z.string().describe('Native currency symbol'),
        plural: z.string().describe('Plural currency name')
      })
      .optional()
  })
  .passthrough();

export let bulkLookupIps = SlateTool.create(spec, {
  name: 'Bulk Lookup IPs',
  key: 'bulk_lookup_ips',
  description: `Look up geolocation and enrichment data for multiple IP addresses in a single request. Supports up to 100 IPv4 or IPv6 addresses at once. Returns the same comprehensive data as a single IP lookup for each address.`,
  constraints: [
    'Maximum of 100 IP addresses per request.',
    'Free API keys are limited to 1,500 requests per day.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddresses: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('List of IPv4 or IPv6 addresses to look up (1-100)'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to return (e.g. ["ip", "city", "country_name"]). Omit to return all fields.'
        )
    })
  )
  .output(
    z.object({
      results: z.array(ipResultSchema).describe('Lookup results for each IP address'),
      totalLookedUp: z.number().describe('Number of IP addresses looked up')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });

    let results = await client.bulkLookup(ctx.input.ipAddresses, ctx.input.fields);

    let countries = [...new Set(results.map(r => r.countryName).filter(Boolean))];
    let countrySummary =
      countries.length > 0 ? countries.slice(0, 5).join(', ') : 'various locations';
    if (countries.length > 5) {
      countrySummary += ` and ${countries.length - 5} more`;
    }

    return {
      output: {
        results,
        totalLookedUp: results.length
      },
      message: `Looked up **${results.length}** IP addresses across **${countrySummary}**.`
    };
  })
  .build();
