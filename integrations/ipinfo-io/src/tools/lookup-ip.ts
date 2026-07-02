import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupIp = SlateTool.create(spec, {
  name: 'Lookup IP Address',
  key: 'lookup_ip',
  description: `Look up detailed information for an IPv4 or IPv6 address, including geolocation, ASN, privacy detection, company, carrier, and network flags. Omit the IP to look up the caller's own address. The depth of data returned depends on your IPinfo plan tier.`,
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
      hostname: z.string().optional().describe('Reverse DNS hostname'),
      city: z.string().optional().describe('City name'),
      region: z.string().optional().describe('Region or state name'),
      country: z.string().optional().describe('Country code (ISO 3166-1 alpha-2)'),
      loc: z.string().optional().describe('Latitude and longitude as comma-separated string'),
      org: z
        .string()
        .optional()
        .describe('Organization/ISP string (e.g. "AS15169 Google LLC")'),
      postal: z.string().optional().describe('Postal/ZIP code'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone identifier (e.g. America/Los_Angeles)'),
      geo: z
        .object({
          city: z.string().optional(),
          region: z.string().optional(),
          regionCode: z.string().optional(),
          country: z.string().optional(),
          countryCode: z.string().optional(),
          continent: z.string().optional(),
          continentCode: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          timezone: z.string().optional(),
          postalCode: z.string().optional(),
          geonameId: z.string().optional(),
          radius: z.number().optional(),
          lastChanged: z.string().optional()
        })
        .optional()
        .describe('Detailed geolocation object (Core tier and above)'),
      asn: z
        .object({
          asn: z.string().optional(),
          name: z.string().optional(),
          domain: z.string().optional(),
          route: z.string().optional(),
          type: z.string().optional()
        })
        .optional()
        .describe('ASN information (Core tier and above)'),
      company: z
        .object({
          name: z.string().optional(),
          domain: z.string().optional(),
          type: z.string().optional()
        })
        .optional()
        .describe('Company information (Plus/Enterprise tier)'),
      carrier: z
        .object({
          name: z.string().optional(),
          mcc: z.string().optional(),
          mnc: z.string().optional()
        })
        .optional()
        .describe('Mobile carrier information (Plus/Enterprise tier)'),
      privacy: z
        .object({
          vpn: z.boolean().optional(),
          proxy: z.boolean().optional(),
          tor: z.boolean().optional(),
          relay: z.boolean().optional(),
          hosting: z.boolean().optional(),
          service: z.string().optional()
        })
        .optional()
        .describe('Privacy/anonymity detection (Core tier and above)'),
      abuse: z
        .object({
          address: z.string().optional(),
          country: z.string().optional(),
          email: z.string().optional(),
          name: z.string().optional(),
          network: z.string().optional(),
          phone: z.string().optional()
        })
        .optional()
        .describe('Abuse contact information'),
      isAnonymous: z.boolean().optional().describe('Whether the IP is an anonymous proxy'),
      isAnycast: z.boolean().optional().describe('Whether the IP is anycast'),
      isHosting: z
        .boolean()
        .optional()
        .describe('Whether the IP belongs to a hosting provider'),
      isMobile: z.boolean().optional().describe('Whether the IP is a mobile connection'),
      isSatellite: z.boolean().optional().describe('Whether the IP is a satellite connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getIpDetails(ctx.input.ip);

    let geo = result.geo
      ? {
          city: result.geo.city,
          region: result.geo.region,
          regionCode: result.geo.region_code,
          country: result.geo.country,
          countryCode: result.geo.country_code,
          continent: result.geo.continent,
          continentCode: result.geo.continent_code,
          latitude: result.geo.latitude,
          longitude: result.geo.longitude,
          timezone: result.geo.timezone,
          postalCode: result.geo.postal_code,
          geonameId: result.geo.geoname_id,
          radius: result.geo.radius,
          lastChanged: result.geo.last_changed
        }
      : undefined;

    let asData = result.as || result.asn;
    let asnOutput = asData
      ? {
          asn: asData.asn,
          name: asData.name,
          domain: asData.domain,
          route: asData.route,
          type: asData.type
        }
      : undefined;

    let locationParts: string[] = [];
    if (result.city || result.geo?.city)
      locationParts.push(result.city || result.geo?.city || '');
    if (result.region || result.geo?.region)
      locationParts.push(result.region || result.geo?.region || '');
    if (result.country || result.geo?.country_code)
      locationParts.push(result.country || result.geo?.country_code || '');
    let locationStr = locationParts.filter(Boolean).join(', ') || 'unknown location';

    return {
      output: {
        ip: result.ip,
        hostname: result.hostname,
        city: result.city,
        region: result.region,
        country: result.country,
        loc: result.loc,
        org: result.org,
        postal: result.postal,
        timezone: result.timezone,
        geo,
        asn: asnOutput,
        company: result.company,
        carrier: result.carrier,
        privacy: result.privacy,
        abuse: result.abuse,
        isAnonymous: result.is_anonymous,
        isAnycast: result.is_anycast,
        isHosting: result.is_hosting,
        isMobile: result.is_mobile,
        isSatellite: result.is_satellite
      },
      message: `IP **${result.ip}** is located in **${locationStr}**${result.org ? ` (${result.org})` : ''}.`
    };
  })
  .build();
