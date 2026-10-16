import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupIp = SlateTool.create(spec, {
  name: 'Lookup IP Address',
  key: 'lookup_ip',
  description: `Get geolocation and network information for an IP address. Returns country, region, timezone, and validity status. Supports both IPv4 and IPv6 addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('IP address in IPv4 (A.B.C.D) or IPv6 format')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      address: z.string().describe('The queried IP address'),
      isValid: z.boolean().describe('Whether the IP address is valid'),
      country: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('2-letter country code'),
      region: z.string().optional().describe('Region or state name'),
      regionCode: z.string().optional().describe('Region code'),
      timezone: z.string().optional().describe('Timezone identifier'),
      city: z.string().optional().describe('City name (premium)'),
      isp: z.string().optional().describe('Internet Service Provider (premium)'),
      lat: z.number().optional().describe('Latitude (premium)'),
      lon: z.number().optional().describe('Longitude (premium)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getIpLookup(ctx.input.address);
    if (typeof result.is_valid !== 'boolean') {
      throw createApiServiceError(
        'API Ninjas did not return an IP validity status. Retry the request.'
      );
    }

    return {
      output: {
        raw: result,
        address: result.address ?? ctx.input.address,
        isValid: result.is_valid,
        country: result.country ?? undefined,
        countryCode: result.country_code ?? undefined,
        region: result.region ?? undefined,
        regionCode: result.region_code ?? undefined,
        timezone: result.timezone ?? undefined,
        city: result.city ?? undefined,
        isp: result.isp ?? undefined,
        lat: result.lat ?? undefined,
        lon: result.lon ?? undefined
      },
      message: result.is_valid
        ? `**${ctx.input.address}** → ${result.country ?? 'Unknown'}${result.region ? `, ${result.region}` : ''}${result.city ? `, ${result.city}` : ''}`
        : `**${ctx.input.address}** is not a valid IP address.`
    };
  })
  .build();
