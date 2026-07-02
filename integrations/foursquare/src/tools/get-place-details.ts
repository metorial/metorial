import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let hoursSchema = z
  .object({
    display: z.string().optional(),
    is_local_holiday: z.boolean().optional(),
    open_now: z.boolean().optional(),
    regular: z
      .array(
        z.object({
          close: z.string().optional(),
          day: z.number().optional(),
          open: z.string().optional()
        })
      )
      .optional()
  })
  .optional();

export let getPlaceDetails = SlateTool.create(spec, {
  name: 'Get Place Details',
  key: 'get_place_details',
  description: `Retrieve comprehensive details about a specific place by its Foursquare ID. Returns rich data including name, address, coordinates, categories, hours, contact info, ratings, popularity, and more. Use the fields parameter to request only specific attributes.`,
  instructions: [
    'Use a Foursquare place ID (fsq_id) obtained from search, autocomplete, or match results.',
    'Use the fields parameter to limit response data and improve performance.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fsqId: z.string().describe('Foursquare place ID (e.g. "4b5988fef964a52049c828e3")'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to include (e.g. "name,location,hours,rating,photos")'
        )
    })
  )
  .output(
    z.object({
      fsqId: z.string().describe('Foursquare place ID'),
      name: z.string().optional().describe('Place name'),
      description: z.string().optional().describe('Place description'),
      tel: z.string().optional().describe('Phone number'),
      fax: z.string().optional().describe('Fax number'),
      email: z.string().optional().describe('Email address'),
      website: z.string().optional().describe('Website URL'),
      socialMedia: z.record(z.string(), z.string()).optional().describe('Social media links'),
      verified: z.boolean().optional().describe('Whether the place is verified'),
      hours: hoursSchema.describe('Operating hours'),
      hoursPopular: z
        .array(
          z.object({
            close: z.string().optional(),
            day: z.number().optional(),
            open: z.string().optional()
          })
        )
        .optional()
        .describe('Popular hours'),
      rating: z.number().optional().describe('Place rating (0-10)'),
      popularity: z.number().optional().describe('Popularity score (0-1)'),
      price: z.number().optional().describe('Price level (1-4)'),
      categories: z
        .array(
          z.object({
            fsq_id: z.string().optional(),
            name: z.string().optional(),
            short_name: z.string().optional(),
            plural_name: z.string().optional()
          })
        )
        .optional()
        .describe('Place categories'),
      chains: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string().optional()
          })
        )
        .optional(),
      closedBucket: z.string().optional(),
      location: z
        .object({
          address: z.string().optional(),
          formatted_address: z.string().optional(),
          locality: z.string().optional(),
          region: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional()
        })
        .optional(),
      geocodes: z
        .object({
          main: z
            .object({
              latitude: z.number().optional(),
              longitude: z.number().optional()
            })
            .optional()
        })
        .optional(),
      timezone: z.string().optional(),
      tastes: z.array(z.string()).optional().describe('Tags associated with the place'),
      features: z
        .record(z.string(), z.any())
        .optional()
        .describe('Place features (e.g. outdoor seating)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let place = await client.getPlaceDetails(ctx.input.fsqId, {
      fields: ctx.input.fields
    });

    return {
      output: {
        fsqId: place.fsq_id || ctx.input.fsqId,
        name: place.name,
        description: place.description,
        tel: place.tel,
        fax: place.fax,
        email: place.email,
        website: place.website,
        socialMedia: place.social_media,
        verified: place.verified,
        hours: place.hours,
        hoursPopular: place.hours_popular,
        rating: place.rating,
        popularity: place.popularity,
        price: place.price,
        categories: place.categories,
        chains: place.chains,
        closedBucket: place.closed_bucket,
        location: place.location,
        geocodes: place.geocodes,
        timezone: place.timezone,
        tastes: place.tastes,
        features: place.features
      },
      message: `Retrieved details for **${place.name || ctx.input.fsqId}**${place.location?.formatted_address ? ` at ${place.location.formatted_address}` : ''}.`
    };
  })
  .build();
