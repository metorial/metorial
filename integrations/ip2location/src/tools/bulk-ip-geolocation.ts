import { isIP } from 'node:net';
import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, checkProviderError } from '../lib/client';
import { mapGeolocation, parseResponse, providerDataSchema } from '../lib/responses';
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
  isProxy: z.boolean().describe('Whether the IP is detected as a proxy'),
  providerData: providerDataSchema
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
    let bulkResult = parseResponse(
      z.record(z.string(), z.unknown()),
      await client.getBulkGeolocation(ctx.input.ipAddresses),
      'bulk geolocation'
    );
    if (!Object.keys(bulkResult).length) {
      throw createApiServiceError(
        'IP2Location returned no bulk geolocation records. Retry the lookup.',
        {
          reason: 'invalid_provider_response'
        }
      );
    }
    let results = Object.entries(bulkResult).map(([ip, data]) => {
      if (!isIP(ip)) {
        throw createApiServiceError(
          'IP2Location returned a bulk record without a valid IP address.',
          {
            reason: 'invalid_provider_response'
          }
        );
      }
      checkProviderError(data, `bulk geolocation for ${ip}`);
      return {
        ip,
        ...mapGeolocation(data),
        providerData: isApiErrorRecord(data) ? data : undefined
      };
    });

    let countries = [...new Set(results.map(r => r.countryName).filter(Boolean))];

    return {
      output: {
        results,
        totalQueried: ctx.input.ipAddresses.length
      },
      message: `Looked up **${results.length}** IP addresses across **${countries.length}** countries: ${countries.slice(0, 5).join(', ')}${countries.length > 5 ? `, and ${countries.length - 5} more` : ''}`
    };
  })
  .build();
