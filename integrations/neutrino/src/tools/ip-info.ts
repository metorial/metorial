import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let ipInfoTool = SlateTool.create(spec, {
  name: 'IP Geolocation',
  key: 'ip_info',
  description: `Look up geolocation and ISP information for an IP address, including city, region, country, coordinates, timezone, and optional reverse DNS hostname.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to look up'),
      reverseLookup: z
        .boolean()
        .optional()
        .describe('Perform reverse DNS lookup to get the hostname')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The IP address'),
      valid: z.boolean().describe('Whether the IP address is valid'),
      isV6: z.boolean().describe('Whether this is an IPv6 address'),
      isBogon: z.boolean().describe('Whether this is a bogon/private IP'),
      country: z.string().describe('Country name'),
      countryCode: z.string().describe('ISO 2-letter country code'),
      continentCode: z.string().describe('Continent code'),
      city: z.string().describe('City name'),
      region: z.string().describe('Region/state name'),
      regionCode: z.string().describe('Region code'),
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      hostname: z.string().describe('Reverse DNS hostname (if reverse lookup enabled)'),
      hostDomain: z.string().describe('Host domain from reverse DNS'),
      currencyCode: z.string().describe('ISO 4217 currency code'),
      timezone: z
        .object({
          timezoneId: z.string().describe('IANA timezone ID'),
          name: z.string().describe('Timezone name'),
          abbr: z.string().describe('Timezone abbreviation'),
          date: z.string().describe('Current date at this location'),
          time: z.string().describe('Current time at this location'),
          offset: z.string().describe('UTC offset')
        })
        .describe('Timezone information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.ipInfo({
      ip: ctx.input.ip,
      reverseLookup: ctx.input.reverseLookup
    });

    let tz = result.timezone ?? {};

    return {
      output: {
        ip: result.ip,
        valid: result.valid,
        isV6: result.isV6 ?? false,
        isBogon: result.isBogon ?? false,
        country: result.country ?? '',
        countryCode: result.countryCode ?? '',
        continentCode: result.continentCode ?? '',
        city: result.city ?? '',
        region: result.region ?? '',
        regionCode: result.regionCode ?? '',
        latitude: result.latitude ?? 0,
        longitude: result.longitude ?? 0,
        hostname: result.hostname ?? '',
        hostDomain: result.hostDomain ?? '',
        currencyCode: result.currencyCode ?? '',
        timezone: {
          timezoneId: tz.id ?? '',
          name: tz.name ?? '',
          abbr: tz.abbr ?? '',
          date: tz.date ?? '',
          time: tz.time ?? '',
          offset: tz.offset ?? ''
        }
      },
      message: result.valid
        ? `**${result.ip}** is located in ${result.city ? `${result.city}, ` : ''}${result.region ? `${result.region}, ` : ''}${result.country} (${result.countryCode}). Coordinates: ${result.latitude}, ${result.longitude}.${result.hostname ? ` Hostname: ${result.hostname}` : ''}`
        : `**${ctx.input.ip}** is not a valid IP address.`
    };
  })
  .build();
