import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let locationMetadataTool = SlateTool.create(spec, {
  name: 'Location Metadata',
  key: 'location_metadata',
  description: `Retrieve full metadata for a location selected from location search results. Returns detailed location information including geocoordinates, street details, suburb, city, region, and state.`,
  instructions: [
    'Use the location identifier returned by the Location Search tool.',
    'For AU locations, provide the locationId (id field from search results).',
    'For NZ locations, provide the pxid from search results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .enum(['au', 'nz'])
        .optional()
        .describe('Country of the location. Defaults to configured default country.'),
      locationId: z
        .string()
        .optional()
        .describe('AU location identifier (id field from location search)'),
      pxid: z
        .string()
        .optional()
        .describe('NZ location identifier (pxid from location search)')
    })
  )
  .output(
    z.object({
      location: z
        .record(z.string(), z.any())
        .describe(
          'Full location metadata including coordinates, street details, and administrative divisions'
        ),
      success: z.boolean().describe('Whether the request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let country = ctx.input.country ?? ctx.config.defaultCountry;
    let data: any;

    if (country === 'au') {
      if (!ctx.input.locationId) {
        throw new Error('locationId is required for AU location metadata');
      }
      data = await client.auLocationMetadata({ locationId: ctx.input.locationId });
    } else {
      if (!ctx.input.pxid) {
        throw new Error('pxid is required for NZ location metadata');
      }
      data = await client.nzLocationMetadata({ pxid: ctx.input.pxid });
    }

    let location = data;
    if (data.completions && Array.isArray(data.completions) && data.completions.length > 0) {
      location = data.completions[0];
    }

    let displayLocation = location.full_location || location.a || 'Location retrieved';

    return {
      output: {
        location,
        success: data.success ?? true
      },
      message: `Retrieved metadata for location: **${displayLocation}**`
    };
  })
  .build();
