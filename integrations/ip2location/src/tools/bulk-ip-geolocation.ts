import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bulkEntrySchema = z.object({
  ip: z.string().describe('IP address'),
  countryCode: z.string().describe('ISO 3166-1 alpha-2 country code'),
  countryName: z.string().describe('Full country name'),
  regionName: z.string().describe('Region or state name'),
  cityName: z.string().describe('City name'),
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  zipCode: z.string().describe('ZIP or postal code'),
  timeZone: z.string().describe('Timezone identifier'),
  asn: z.string().describe('Autonomous System Number'),
  asName: z.string().describe('Autonomous System name'),
  isProxy: z.boolean().describe('Whether the IP is detected as a proxy')
});

export let bulkIpGeolocation = SlateTool.create(spec, {
  name: 'Bulk IP Geolocation',
  key: 'bulk_ip_geolocation',
  description: `Look up geographic location and network metadata for multiple IP addresses in a single request. Returns country, region, city, coordinates, timezone, ASN, and proxy status for each IP.

Useful for batch processing large lists of IP addresses efficiently instead of making individual requests.`,
  constraints: ['Maximum of 1000 IP addresses per request.', 'Requires a paid plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddresses: z
        .array(z.string())
        .min(1)
        .max(1000)
        .describe('List of IPv4 or IPv6 addresses to look up (max 1000)')
    })
  )
  .output(
    z.object({
      results: z.array(bulkEntrySchema).describe('Geolocation results for each IP address'),
      totalQueried: z.number().describe('Number of IPs that were queried')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let bulkResult = await client.getBulkGeolocation(
      ctx.input.ipAddresses,
      ctx.config.language
    );

    let results = Object.entries(bulkResult).map(([ip, data]) => ({
      ip,
      countryCode: data.country_code || '',
      countryName: data.country_name || '',
      regionName: data.region_name || '',
      cityName: data.city_name || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      zipCode: data.zip_code || '',
      timeZone: data.time_zone || '',
      asn: data.asn || '',
      asName: data.as || '',
      isProxy: data.is_proxy || false
    }));

    let countries = [...new Set(results.map(r => r.countryName).filter(Boolean))];

    return {
      output: {
        results,
        totalQueried: results.length
      },
      message: `Looked up **${results.length}** IP addresses across **${countries.length}** countries: ${countries.slice(0, 5).join(', ')}${countries.length > 5 ? `, and ${countries.length - 5} more` : ''}`
    };
  })
  .build();
