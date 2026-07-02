import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let ipGeolocation = SlateTool.create(spec, {
  name: 'IP Geolocation',
  key: 'ip_geolocation',
  description: `Detect a user's approximate location by IP address. Returns country, city, coordinates, timezone, and language information. Omit the IP address to detect the caller's own location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z
        .string()
        .optional()
        .describe("IP address to geolocate. Leave empty to detect the caller's IP.")
    })
  )
  .output(
    z.object({
      ip: z.string().optional().describe('Detected IP address'),
      lat: z.number().optional().describe('Latitude'),
      lon: z.number().optional().describe('Longitude'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State or region'),
      country: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('ISO country code'),
      postcode: z.string().optional().describe('Postal code'),
      continent: z.string().optional().describe('Continent name'),
      timezone: z.string().optional().describe('Timezone name (e.g. "America/New_York")'),
      languages: z
        .array(
          z.object({
            name: z.string().optional().describe('Language name'),
            code: z.string().optional().describe('ISO language code')
          })
        )
        .optional()
        .describe('Languages spoken in the detected location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.ipGeolocation({ ip: ctx.input.ipAddress });

    let languages = (data.country?.languages || []).map((l: any) => ({
      name: l.name,
      code: l.code
    }));

    return {
      output: {
        ip: data.ip,
        lat: data.location?.latitude,
        lon: data.location?.longitude,
        city: data.city?.name,
        state: data.state?.name,
        country: data.country?.name,
        countryCode: data.country?.iso_code,
        postcode: data.postal,
        continent: data.continent?.name,
        timezone: data.location?.time_zone,
        languages: languages.length > 0 ? languages : undefined
      },
      message: `IP **${data.ip || ctx.input.ipAddress || 'auto-detected'}** located in ${data.city?.name || 'unknown'}, ${data.country?.name || 'unknown'}`
    };
  })
  .build();
