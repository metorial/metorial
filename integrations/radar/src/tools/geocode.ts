import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  latitude: z.number().optional().describe('Latitude'),
  longitude: z.number().optional().describe('Longitude'),
  formattedAddress: z.string().optional().describe('Full formatted address'),
  addressLabel: z.string().optional().describe('Short address label'),
  number: z.string().optional().describe('Street number'),
  street: z.string().optional().describe('Street name'),
  neighborhood: z.string().optional().describe('Neighborhood'),
  city: z.string().optional().describe('City'),
  county: z.string().optional().describe('County'),
  state: z.string().optional().describe('State'),
  stateCode: z.string().optional().describe('State code'),
  postalCode: z.string().optional().describe('Postal code'),
  country: z.string().optional().describe('Country'),
  countryCode: z.string().optional().describe('Country code'),
  layer: z.string().optional().describe('Result layer type'),
  confidence: z
    .string()
    .optional()
    .describe('Result confidence: exact, interpolated, or fallback'),
  distance: z.number().optional().describe('Distance from query point in meters')
});

export let geocodeTool = SlateTool.create(spec, {
  name: 'Geocode',
  key: 'geocode',
  description: `Convert between addresses and coordinates. Supports **forward geocoding** (address → coordinates), **reverse geocoding** (coordinates → address), and **IP geocoding** (IP → approximate location). Specify the geocoding mode and provide the appropriate input.`,
  constraints: ['Rate limited to 10 requests per second for forward and reverse geocoding.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['forward', 'reverse', 'ip'])
        .describe(
          'Geocoding mode: forward (address to coordinates), reverse (coordinates to address), or ip (IP to location)'
        ),
      query: z.string().optional().describe('Address to geocode (required for forward mode)'),
      latitude: z.number().optional().describe('Latitude (required for reverse mode)'),
      longitude: z.number().optional().describe('Longitude (required for reverse mode)'),
      ip: z
        .string()
        .optional()
        .describe('IP address (optional for ip mode — uses requester IP if omitted)'),
      layers: z
        .string()
        .optional()
        .describe(
          'Comma-separated result layers: place, address, postalCode, locality, county, state, country, coarse, fine'
        ),
      country: z.string().optional().describe('Country code filter (forward mode only)'),
      lang: z.string().optional().describe('Language preference for results')
    })
  )
  .output(
    z.object({
      addresses: z.array(addressSchema).describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let addresses: any[] = [];

    if (ctx.input.mode === 'forward') {
      if (!ctx.input.query) throw new Error('Query is required for forward geocoding.');
      let result = await client.forwardGeocode({
        query: ctx.input.query,
        layers: ctx.input.layers,
        country: ctx.input.country,
        lang: ctx.input.lang
      });
      addresses = result.addresses || [];
    } else if (ctx.input.mode === 'reverse') {
      if (ctx.input.latitude === undefined || ctx.input.longitude === undefined) {
        throw new Error('Latitude and longitude are required for reverse geocoding.');
      }
      let result = await client.reverseGeocode({
        coordinates: `${ctx.input.latitude},${ctx.input.longitude}`,
        layers: ctx.input.layers,
        lang: ctx.input.lang
      });
      addresses = result.addresses || [];
    } else if (ctx.input.mode === 'ip') {
      let result = await client.ipGeocode({ ip: ctx.input.ip });
      addresses = result.address ? [result.address] : [];
    }

    let mapped = addresses.map((a: any) => ({
      latitude: a.latitude,
      longitude: a.longitude,
      formattedAddress: a.formattedAddress,
      addressLabel: a.addressLabel,
      number: a.number,
      street: a.street,
      neighborhood: a.neighborhood,
      city: a.city,
      county: a.county,
      state: a.state,
      stateCode: a.stateCode,
      postalCode: a.postalCode,
      country: a.country,
      countryCode: a.countryCode,
      layer: a.layer,
      confidence: a.confidence,
      distance: a.distance
    }));

    return {
      output: { addresses: mapped },
      message: `${ctx.input.mode} geocoding returned **${mapped.length}** result(s).`
    };
  })
  .build();
