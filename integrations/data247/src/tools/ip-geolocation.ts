import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let geoResultSchema = z.object({
  ipAddress: z.string().optional().describe('The queried IP address'),
  city: z.string().optional().describe('City of the IP location'),
  state: z.string().optional().describe('State/region of the IP location'),
  country: z.string().optional().describe('Country of the IP location'),
  zipCode: z.string().optional().describe('ZIP/postal code'),
  latitude: z.string().optional().describe('Latitude coordinate'),
  longitude: z.string().optional().describe('Longitude coordinate'),
  areaCode: z.string().optional().describe('Area code (USA only)'),
  timezone: z.string().optional().describe('Timezone'),
  dst: z.string().optional().describe('Whether DST is active')
});

let mapResult = (raw: Record<string, string>) => ({
  ipAddress: raw.ip_address,
  city: raw.city,
  state: raw.state,
  country: raw.country,
  zipCode: raw.zipcode,
  latitude: raw.latitude,
  longitude: raw.longitude,
  areaCode: raw.areacode,
  timezone: raw.timezone,
  dst: raw.dst
});

export let ipGeolocation = SlateTool.create(spec, {
  name: 'IP Geolocation',
  key: 'ip_geolocation',
  description: `Geolocate IP addresses to find their physical location anywhere in the world. Returns city, state, country, ZIP code, latitude, longitude, area code, timezone, and DST information. Useful for fraud detection, content targeting, and traffic analysis.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddresses: z.array(z.string()).min(1).max(100).describe('IP addresses to geolocate')
    })
  )
  .output(
    z.object({
      results: z.array(geoResultSchema).describe('Geolocation data for each IP address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { ipAddresses } = ctx.input;

    let results: Record<string, string>[];

    if (ipAddresses.length === 1) {
      let result = await client.ipGeolocation(ipAddresses[0]!);
      results = [result];
    } else {
      results = await client.ipGeolocationBatch(ipAddresses);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Geolocated **${ipAddresses.length}** IP address(es).`
    };
  })
  .build();
