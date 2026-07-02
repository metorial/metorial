import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let getPlaceDetails = SlateTool.create(spec, {
  name: 'Get Place Details',
  key: 'get_place_details',
  description: `Get detailed information about a specific place, including building geometry, contact info, Wikipedia references, and nearby amenities. Can also query surroundings within a radius or reachability area (walking/driving isoline). Provide a place ID from geocoding/places results, or coordinates.`,
  instructions: [
    'Provide either a placeId (from geocoding/places results) or lat/lon coordinates.',
    'Use features to request specific data: "details" for full info, "building" for building geometry.',
    'Surroundings features: "radius_500" (within 500m), "walk_10" (10 min walk), "drive_5" (5 min drive).',
    'Append category to surroundings: "radius_500.supermarket", "walk_10.restaurant", "drive_5.atm".',
    'Combine features with commas: "details,building,walk_10.supermarket".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      placeId: z
        .string()
        .optional()
        .describe('Place ID from geocoding or places search results'),
      lat: z.number().optional().describe('Latitude (alternative to placeId)'),
      lon: z.number().optional().describe('Longitude (alternative to placeId)'),
      features: z
        .string()
        .optional()
        .describe(
          'Comma-separated features to include (e.g. "details,building,walk_10.supermarket")'
        ),
      lang: z.string().optional().describe('ISO 639-1 language code')
    })
  )
  .output(
    z.object({
      features: z
        .array(
          z.object({
            featureType: z.string().optional().describe('Type of feature returned'),
            placeId: z.string().optional().describe('Place identifier'),
            name: z.string().optional().describe('Place name'),
            formatted: z.string().optional().describe('Formatted address'),
            lat: z.number().optional().describe('Latitude'),
            lon: z.number().optional().describe('Longitude'),
            categories: z.array(z.string()).optional().describe('Place categories'),
            website: z.string().optional().describe('Website URL'),
            phone: z.string().optional().describe('Phone number'),
            openingHours: z.string().optional().describe('Opening hours'),
            geometry: z
              .any()
              .optional()
              .describe('GeoJSON geometry (building outline, isoline polygon, etc.)')
          })
        )
        .describe('Place detail features')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.getPlaceDetails({
      placeId: ctx.input.placeId,
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      features: ctx.input.features,
      lang: ctx.input.lang
    });

    let features = (data.features || []).map((f: any) => {
      let p = f.properties || {};
      let coords = f.geometry?.type === 'Point' ? f.geometry.coordinates : undefined;
      return {
        featureType: p.feature_type,
        placeId: p.place_id,
        name: p.name,
        formatted: p.formatted,
        lat: coords?.[1] ?? p.lat,
        lon: coords?.[0] ?? p.lon,
        categories: p.categories,
        website: p.website,
        phone: p.contact?.phone,
        openingHours: p.opening_hours,
        geometry: f.geometry
      };
    });

    return {
      output: { features },
      message: `Retrieved **${features.length}** feature(s) for the requested place details.`
    };
  })
  .build();
