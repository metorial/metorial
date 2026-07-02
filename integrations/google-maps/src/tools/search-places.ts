import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let placeSchema = z.object({
  placeId: z.string().describe('Unique Google place identifier'),
  name: z.string().optional().describe('Display name of the place'),
  formattedAddress: z.string().optional().describe('Full formatted address'),
  latitude: z.number().optional().describe('Latitude'),
  longitude: z.number().optional().describe('Longitude'),
  rating: z.number().optional().describe('Average user rating (1.0-5.0)'),
  userRatingCount: z.number().optional().describe('Total number of user ratings'),
  types: z.array(z.string()).optional().describe('Place types (e.g. restaurant, cafe)'),
  primaryType: z.string().optional().describe('Primary place type'),
  businessStatus: z.string().optional().describe('Business operational status'),
  priceLevel: z.string().optional().describe('Price level category'),
  websiteUrl: z.string().optional().describe('Website URL'),
  phoneNumber: z.string().optional().describe('Phone number')
});

export let searchPlacesTool = SlateTool.create(spec, {
  name: 'Search Places',
  key: 'search_places',
  description: `Search for places by text query or by proximity to a location. Supports **text search** (e.g. "pizza in New York") and **nearby search** (find places of specific types near coordinates). Returns place names, addresses, ratings, types, and contact information.`,
  instructions: [
    'For text search, provide a textQuery. For nearby search, provide latitude, longitude, and radius.',
    'Use includedType/includedTypes to filter by place type (e.g. "restaurant", "gas_station", "hospital").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      textQuery: z
        .string()
        .optional()
        .describe(
          'Text search query (e.g. "pizza in New York"). Use this for text-based search.'
        ),
      latitude: z.number().optional().describe('Center latitude for nearby search'),
      longitude: z.number().optional().describe('Center longitude for nearby search'),
      radius: z
        .number()
        .optional()
        .describe('Search radius in meters for nearby search (max 50000)'),
      includedType: z
        .string()
        .optional()
        .describe('Place type filter for text search (e.g. "restaurant")'),
      includedTypes: z
        .array(z.string())
        .optional()
        .describe('Place type filters for nearby search'),
      excludedTypes: z
        .array(z.string())
        .optional()
        .describe('Place types to exclude from nearby search'),
      maxResultCount: z.number().optional().describe('Maximum number of results (default 20)'),
      openNow: z.boolean().optional().describe('Only return places that are currently open'),
      minRating: z.number().optional().describe('Minimum user rating (1.0-5.0)'),
      languageCode: z.string().optional().describe('Language for results (e.g. "en")'),
      regionCode: z
        .string()
        .optional()
        .describe('Region code to bias text search results (e.g. "US")'),
      rankPreference: z
        .string()
        .optional()
        .describe('Ranking preference: "RELEVANCE" or "DISTANCE"'),
      locationBiasLatitude: z
        .number()
        .optional()
        .describe('Latitude to bias text search results toward'),
      locationBiasLongitude: z
        .number()
        .optional()
        .describe('Longitude to bias text search results toward'),
      locationBiasRadius: z
        .number()
        .optional()
        .describe('Radius in meters for text search location bias')
    })
  )
  .output(
    z.object({
      places: z.array(placeSchema).describe('Search results'),
      totalCount: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });
    let rawPlaces: Record<string, unknown>[];

    if (ctx.input.textQuery) {
      let locationBias: { latitude: number; longitude: number; radius: number } | undefined;
      if (
        ctx.input.locationBiasLatitude !== undefined &&
        ctx.input.locationBiasLongitude !== undefined
      ) {
        locationBias = {
          latitude: ctx.input.locationBiasLatitude,
          longitude: ctx.input.locationBiasLongitude,
          radius: ctx.input.locationBiasRadius || 5000
        };
      }

      let response = await client.searchPlacesText({
        textQuery: ctx.input.textQuery,
        languageCode: ctx.input.languageCode,
        regionCode: ctx.input.regionCode,
        rankPreference: ctx.input.rankPreference,
        includedType: ctx.input.includedType,
        openNow: ctx.input.openNow,
        minRating: ctx.input.minRating,
        maxResultCount: ctx.input.maxResultCount,
        locationBias
      });
      rawPlaces = response.places || [];
    } else if (
      ctx.input.latitude !== undefined &&
      ctx.input.longitude !== undefined &&
      ctx.input.radius !== undefined
    ) {
      let response = await client.searchPlacesNearby({
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude,
        radius: ctx.input.radius,
        includedTypes: ctx.input.includedTypes,
        excludedTypes: ctx.input.excludedTypes,
        maxResultCount: ctx.input.maxResultCount,
        languageCode: ctx.input.languageCode,
        rankPreference: ctx.input.rankPreference
      });
      rawPlaces = response.places || [];
    } else {
      throw new Error(
        'Provide either a textQuery (text search) or latitude/longitude/radius (nearby search).'
      );
    }

    let places = rawPlaces.map((p: Record<string, unknown>) => {
      let displayName = p.displayName as Record<string, string> | undefined;
      let location = p.location as Record<string, number> | undefined;

      return {
        placeId: p.id as string,
        name: displayName?.text,
        formattedAddress: p.formattedAddress as string | undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        rating: p.rating as number | undefined,
        userRatingCount: p.userRatingCount as number | undefined,
        types: p.types as string[] | undefined,
        primaryType: p.primaryType as string | undefined,
        businessStatus: p.businessStatus as string | undefined,
        priceLevel: p.priceLevel as string | undefined,
        websiteUrl: p.websiteUri as string | undefined,
        phoneNumber: p.nationalPhoneNumber as string | undefined
      };
    });

    let searchType = ctx.input.textQuery ? `"${ctx.input.textQuery}"` : 'nearby search';
    let message = `Found **${places.length}** place(s) for ${searchType}.${places.length > 0 ? ` Top: **${places[0]!.name || places[0]!.formattedAddress}**` : ''}`;

    return {
      output: { places, totalCount: places.length },
      message
    };
  })
  .build();
