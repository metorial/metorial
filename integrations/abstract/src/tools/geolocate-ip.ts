import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let geolocateIp = SlateTool.create(spec, {
  name: 'Geolocate IP',
  key: 'geolocate_ip',
  description: `Looks up geographic and security information for an IP address. Returns location data (city, region, country, coordinates), timezone, ASN, company, security flags (VPN, proxy, Tor), and more. If no IP address is provided, it returns data for the requester's IP.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z
        .string()
        .optional()
        .describe("The IP address to geolocate. If omitted, uses the requester's IP."),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of top-level response fields to include (e.g. "city,country,timezone")'
        )
    })
  )
  .output(
    z.object({
      ipAddress: z.string().optional().describe('The queried IP address'),
      city: z.string().optional().describe('City name'),
      region: z.string().optional().describe('State or province name'),
      regionIsoCode: z.string().optional().describe('ISO code for the region'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('ISO country code'),
      isCountryEu: z.boolean().optional().describe('Whether the country is an EU member'),
      continent: z.string().optional().describe('Continent name'),
      continentCode: z.string().optional().describe('Continent code'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      timezone: z
        .object({
          name: z.string().optional().describe('Timezone name (e.g. America/New_York)'),
          abbreviation: z.string().optional().describe('Timezone abbreviation'),
          utcOffset: z.string().optional().describe('UTC offset'),
          localTime: z.string().optional().describe('Current local time'),
          isDst: z.boolean().optional().describe('Whether daylight saving time is active')
        })
        .optional()
        .describe('Timezone information'),
      security: z
        .object({
          isVpn: z.boolean().optional().describe('Whether the IP is associated with a VPN'),
          isProxy: z.boolean().optional().describe('Whether the IP is a proxy'),
          isTor: z.boolean().optional().describe('Whether the IP is a Tor exit node'),
          isRelay: z.boolean().optional().describe('Whether the IP is a relay'),
          isHosting: z
            .boolean()
            .optional()
            .describe('Whether the IP belongs to a hosting provider'),
          isAbuser: z.boolean().optional().describe('Whether the IP is associated with abuse')
        })
        .optional()
        .describe('Security flags'),
      flag: z
        .object({
          emoji: z.string().optional().describe('Country flag emoji'),
          svgUrl: z.string().optional().describe('URL to SVG flag image'),
          pngUrl: z.string().optional().describe('URL to PNG flag image')
        })
        .optional()
        .describe('Country flag information'),
      currency: z
        .object({
          currencyName: z.string().optional().describe('Currency name'),
          currencyCode: z.string().optional().describe('Currency code')
        })
        .optional()
        .describe('Currency information'),
      connectionAsn: z.number().optional().describe('Autonomous System Number'),
      connectionIsp: z.string().optional().describe('Internet Service Provider name'),
      companyName: z.string().optional().describe('Company or organization name'),
      companyDomain: z.string().optional().describe('Company domain'),
      companyType: z
        .string()
        .optional()
        .describe('Company type (e.g. isp, business, education)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.geolocateIp({
      ipAddress: ctx.input.ipAddress,
      fields: ctx.input.fields
    });

    let output = {
      ipAddress: result.ip_address ?? undefined,
      city: result.city ?? undefined,
      region: result.region ?? undefined,
      regionIsoCode: result.region_iso_code ?? undefined,
      postalCode: result.postal_code ?? undefined,
      country: result.country ?? undefined,
      countryCode: result.country_code ?? undefined,
      isCountryEu: result.is_country_eu ?? undefined,
      continent: result.continent ?? undefined,
      continentCode: result.continent_code ?? undefined,
      longitude: result.longitude != null ? Number(result.longitude) : undefined,
      latitude: result.latitude != null ? Number(result.latitude) : undefined,
      timezone: result.timezone
        ? {
            name: result.timezone.name ?? undefined,
            abbreviation: result.timezone.abbreviation ?? undefined,
            utcOffset:
              result.timezone.gmt_offset != null
                ? String(result.timezone.gmt_offset)
                : undefined,
            localTime: result.timezone.current_time ?? undefined,
            isDst: result.timezone.is_dst ?? undefined
          }
        : undefined,
      security: result.security
        ? {
            isVpn: result.security.is_vpn ?? undefined,
            isProxy: result.security.is_proxy ?? undefined,
            isTor: result.security.is_tor ?? undefined,
            isRelay: result.security.is_relay ?? undefined,
            isHosting: result.security.is_hosting ?? undefined,
            isAbuser: result.security.is_abuser ?? undefined
          }
        : undefined,
      flag: result.flag
        ? {
            emoji: result.flag.emoji ?? undefined,
            svgUrl: result.flag.svg ?? undefined,
            pngUrl: result.flag.png ?? undefined
          }
        : undefined,
      currency: result.currency
        ? {
            currencyName: result.currency.currency_name ?? undefined,
            currencyCode: result.currency.currency_code ?? undefined
          }
        : undefined,
      connectionAsn:
        result.connection?.autonomous_system_number != null
          ? Number(result.connection.autonomous_system_number)
          : undefined,
      connectionIsp: result.connection?.isp_name ?? undefined,
      companyName: result.company?.name ?? undefined,
      companyDomain: result.company?.domain ?? undefined,
      companyType: result.company?.type ?? undefined
    };

    let locationParts = [output.city, output.region, output.country].filter(Boolean);
    let location = locationParts.length > 0 ? locationParts.join(', ') : 'unknown location';

    return {
      output,
      message: `IP **${output.ipAddress ?? 'unknown'}** is located in **${location}**${output.connectionIsp ? ` (ISP: ${output.connectionIsp})` : ''}.`
    };
  })
  .build();
