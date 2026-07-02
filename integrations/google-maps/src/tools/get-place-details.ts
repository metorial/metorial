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

export let getPlaceDetailsTool = SlateTool.create(spec, {
  name: 'Get Place Details',
  key: 'get_place_details',
  description: `Retrieve comprehensive details about a specific place using its place ID. Returns address, phone number, website, rating, reviews, opening hours, editorial summary, and a link to Google Maps.`,
  instructions: [
    'Use a place ID obtained from the Search Places tool or from geocoding results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      placeId: z.string().describe('Google place ID (e.g. "ChIJj61dQgK6j4AR4GeTYWZsKWw")'),
      languageCode: z.string().optional().describe('Language for results (e.g. "en")')
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
      openingHours: z.array(z.string()).optional().describe('Weekly opening hours text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let data = await client.getPlaceDetails({
      placeId: ctx.input.placeId,
      languageCode: ctx.input.languageCode
    });

    let displayName = data.displayName as Record<string, string> | undefined;
    let location = data.location as Record<string, number> | undefined;
    let editorialSummary = data.editorialSummary as Record<string, string> | undefined;
    let rawReviews = (data.reviews as Record<string, unknown>[]) || [];
    let openingHours = data.regularOpeningHours as Record<string, unknown> | undefined;

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
      openingHours: (openingHours?.weekdayDescriptions as string[]) || undefined
    };

    let message = `Retrieved details for **${output.name || ctx.input.placeId}**${output.rating ? ` (${output.rating}⭐)` : ''}.`;

    return { output, message };
  })
  .build();
