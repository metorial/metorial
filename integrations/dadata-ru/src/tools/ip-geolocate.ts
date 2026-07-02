import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

export let ipGeolocate = SlateTool.create(spec, {
  name: 'IP Geolocate',
  key: 'ip_geolocate',
  description: `Detects the approximate geographic location (city-level) based on an IP address. Returns address data including city, region, and postal code.
Supports IPv4 and IPv6 addresses. Primarily covers Russian IP addresses.`,
  constraints: [
    'Accuracy: 60-80%, primarily Russian IPs.',
    'Returns city-level location only, not street-level.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to geolocate'),
      language: z.enum(['ru', 'en']).optional().describe('Response language')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a location was found for this IP'),
      value: z.string().nullable().describe('Formatted location string'),
      postalCode: z.string().nullable().describe('Postal code'),
      country: z.string().nullable().describe('Country'),
      countryIsoCode: z.string().nullable().describe('ISO country code'),
      federalDistrict: z.string().nullable().describe('Federal district'),
      regionWithType: z.string().nullable().describe('Region with type'),
      region: z.string().nullable().describe('Region'),
      cityWithType: z.string().nullable().describe('City with type'),
      city: z.string().nullable().describe('City'),
      fiasId: z.string().nullable().describe('FIAS identifier'),
      kladrId: z.string().nullable().describe('KLADR identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.iplocateAddress({
      ip: ctx.input.ipAddress,
      language: ctx.input.language || ctx.config.language
    });

    let loc = data.location;
    if (!loc) {
      return {
        output: {
          found: false,
          value: null,
          postalCode: null,
          country: null,
          countryIsoCode: null,
          federalDistrict: null,
          regionWithType: null,
          region: null,
          cityWithType: null,
          city: null,
          fiasId: null,
          kladrId: null
        },
        message: `No location found for IP "${ctx.input.ipAddress}".`
      };
    }

    return {
      output: {
        found: true,
        value: loc.value ?? null,
        postalCode: loc.data?.postal_code ?? null,
        country: loc.data?.country ?? null,
        countryIsoCode: loc.data?.country_iso_code ?? null,
        federalDistrict: loc.data?.federal_district ?? null,
        regionWithType: loc.data?.region_with_type ?? null,
        region: loc.data?.region ?? null,
        cityWithType: loc.data?.city_with_type ?? null,
        city: loc.data?.city ?? null,
        fiasId: loc.data?.fias_id ?? null,
        kladrId: loc.data?.kladr_id ?? null
      },
      message: `IP "${ctx.input.ipAddress}" located in **${loc.value || 'Unknown'}**.`
    };
  })
  .build();
