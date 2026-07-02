import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupIp = SlateTool.create(spec, {
  name: 'IP Geolocation Lookup',
  key: 'lookup_ip',
  description: `Look up the geographic location of an IP address. Returns country, region, city, timezone, and coordinates. Useful for geolocation, security analysis, and user segmentation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('The IP address to look up (e.g. "173.172.81.20")')
    })
  )
  .output(
    z.object({
      ipAddress: z.string().describe('The queried IP address'),
      country: z.string().describe('Two-letter country code'),
      countryName: z.string().describe('Full country name'),
      region: z.string().describe('Region/state code'),
      regionName: z.string().describe('Full region/state name'),
      city: z.string().optional().describe('City name'),
      timezone: z.string().describe('IANA timezone identifier'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.lookupIp(ctx.input.ipAddress);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'IP lookup failed');
    }

    let data = result.data;
    let coords = data.coordinates ?? [];

    let output = {
      ipAddress: data.ip,
      country: data.country,
      countryName: data.countryName,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      timezone: data.timezone,
      latitude: coords[0],
      longitude: coords[1]
    };

    let locationParts = [data.city, data.regionName, data.countryName].filter(Boolean);

    return {
      output,
      message: `IP \`${data.ip}\` is located in **${locationParts.join(', ')}** (${data.timezone}).`
    };
  })
  .build();
