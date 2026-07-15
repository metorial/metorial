import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let reviewSchema = z.object({
  authorName: z.string().optional().describe('Reviewer name'),
  rating: z.number().optional().describe('Review rating (1-5)'),
  text: z.string().optional().describe('Review text'),
  relativePublishTime: z.string().optional().describe('Relative time of publication'),
  publishTime: z.string().optional().describe('Absolute publish timestamp')
});

let authorAttributionSchema = z.object({
  displayName: z.string().optional().describe('Photo author display name'),
  uri: z.string().optional().describe('Photo author profile URI'),
  photoUri: z.string().optional().describe('Photo author avatar URI')
});

let photoSchema = z.object({
  name: z
    .string()
    .describe('Current Places API photo resource name accepted by get_place_photo'),
  widthPx: z.number().int().positive().optional().describe('Source image width in pixels'),
  heightPx: z.number().int().positive().optional().describe('Source image height in pixels'),
  authorAttributions: z
    .array(authorAttributionSchema)
    .describe(
      'Attributions that must accompany the displayed photo; empty when none are required'
    )
});

export let getPlaceDetailsTool = SlateTool.create(spec, {
  name: 'Get Place Details',
  key: 'get_place_details',
  description: `Retrieve comprehensive details about a specific place using its place ID. Returns address, phone number, website, rating, reviews, opening hours, editorial summary, and a link to Google Maps.`,
  instructions: [
    'Use a place ID obtained from Search Places, Autocomplete Places, or geocoding results.',
    'When selecting an autocomplete result, pass the same sessionToken used for that autocomplete typing session.',
    'Pass a returned photos[].name to get_place_photo immediately; photo names can expire and must not be cached.'
  ],
  constraints: [
    'When a photo includes authorAttributions, preserve and display them wherever the photo is shown.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      placeId: z.string().describe('Google place ID (e.g. "ChIJj61dQgK6j4AR4GeTYWZsKWw")'),
      languageCode: z.string().optional().describe('Language for results (e.g. "en")'),
      sessionToken: z
        .string()
        .trim()
        .min(1)
        .max(36)
        .regex(/^[A-Za-z0-9_-]+$/)
        .optional()
        .describe('Session token from the selected autocomplete typing session')
    })
  )
  .output(
    z.object({
      placeId: z.string().describe('Google place ID'),
      name: z.string().optional().describe('Display name'),
      formattedAddress: z.string().optional().describe('Full formatted address'),
      shortAddress: z.string().optional().describe('Short formatted address'),
      latitude: z.number().optional().describe('Latitude'),
      longitude: z.number().optional().describe('Longitude'),
      rating: z.number().optional().describe('Average user rating'),
      userRatingCount: z.number().optional().describe('Total user ratings'),
      types: z.array(z.string()).optional().describe('Place types'),
      primaryType: z.string().optional().describe('Primary place type'),
      businessStatus: z.string().optional().describe('Business status'),
      priceLevel: z.string().optional().describe('Price level'),
      websiteUrl: z.string().optional().describe('Website URL'),
      phoneNumber: z.string().optional().describe('National phone number'),
      internationalPhoneNumber: z.string().optional().describe('International phone number'),
      googleMapsUrl: z.string().optional().describe('Google Maps URL'),
      editorialSummary: z.string().optional().describe('AI or editorial summary of the place'),
      reviews: z.array(reviewSchema).optional().describe('User reviews'),
      openingHours: z.array(z.string()).optional().describe('Weekly opening hours text'),
      photos: z
        .array(photoSchema)
        .describe('Current photo resources and required attributions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let data = await client.getPlaceDetails({
      placeId: ctx.input.placeId,
      languageCode: ctx.input.languageCode,
      sessionToken: ctx.input.sessionToken
    });

    let displayName = data.displayName as Record<string, string> | undefined;
    let location = data.location as Record<string, number> | undefined;
    let editorialSummary = data.editorialSummary as Record<string, string> | undefined;
    let rawReviews = (data.reviews as Record<string, unknown>[]) || [];
    let openingHours = data.regularOpeningHours as Record<string, unknown> | undefined;
    let rawPhotos = Array.isArray(data.photos)
      ? (data.photos as Record<string, unknown>[])
      : [];

    let reviews = rawReviews.map(r => {
      let authorAttribution = r.authorAttribution as Record<string, string> | undefined;
      let originalText = r.originalText as Record<string, string> | undefined;
      return {
        authorName: authorAttribution?.displayName,
        rating: r.rating as number | undefined,
        text: originalText?.text || (r.text as Record<string, string> | undefined)?.text,
        relativePublishTime: r.relativePublishTimeDescription as string | undefined,
        publishTime: r.publishTime as string | undefined
      };
    });

    let photos = rawPhotos
      .filter(photo => typeof photo.name === 'string' && photo.name.length > 0)
      .map(photo => {
        let rawAttributions = Array.isArray(photo.authorAttributions)
          ? (photo.authorAttributions as Record<string, unknown>[])
          : [];
        let authorAttributions = rawAttributions.map(attribution => ({
          displayName:
            typeof attribution.displayName === 'string' ? attribution.displayName : undefined,
          uri: typeof attribution.uri === 'string' ? attribution.uri : undefined,
          photoUri: typeof attribution.photoUri === 'string' ? attribution.photoUri : undefined
        }));

        return {
          name: photo.name as string,
          widthPx: typeof photo.widthPx === 'number' ? photo.widthPx : undefined,
          heightPx: typeof photo.heightPx === 'number' ? photo.heightPx : undefined,
          authorAttributions
        };
      });

    let output = {
      placeId: data.id as string,
      name: displayName?.text,
      formattedAddress: data.formattedAddress as string | undefined,
      shortAddress: data.shortFormattedAddress as string | undefined,
      latitude: location?.latitude,
      longitude: location?.longitude,
      rating: data.rating as number | undefined,
      userRatingCount: data.userRatingCount as number | undefined,
      types: data.types as string[] | undefined,
      primaryType: data.primaryType as string | undefined,
      businessStatus: data.businessStatus as string | undefined,
      priceLevel: data.priceLevel as string | undefined,
      websiteUrl: data.websiteUri as string | undefined,
      phoneNumber: data.nationalPhoneNumber as string | undefined,
      internationalPhoneNumber: data.internationalPhoneNumber as string | undefined,
      googleMapsUrl: data.googleMapsUri as string | undefined,
      editorialSummary: editorialSummary?.text,
      reviews,
      openingHours: (openingHours?.weekdayDescriptions as string[]) || undefined,
      photos
    };

    let message = `Retrieved details for **${output.name || ctx.input.placeId}**${output.rating ? ` (${output.rating}⭐)` : ''}.`;

    return { output, message };
  })
  .build();
