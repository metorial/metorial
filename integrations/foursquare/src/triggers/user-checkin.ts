import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let checkinInputSchema = z.object({
  checkinId: z.string().describe('Check-in ID'),
  eventType: z.string().describe('Event type'),
  userId: z.string().optional().describe('User ID'),
  userName: z.string().optional().describe('User display name'),
  venueFsqId: z.string().optional().describe('Venue Foursquare ID'),
  venueName: z.string().optional().describe('Venue name'),
  venueAddress: z.string().optional().describe('Venue formatted address'),
  venueLatitude: z.number().optional().describe('Venue latitude'),
  venueLongitude: z.number().optional().describe('Venue longitude'),
  venueCategories: z
    .array(
      z.object({
        categoryId: z.string().optional(),
        categoryName: z.string().optional()
      })
    )
    .optional(),
  shout: z.string().optional().describe('Check-in shout message'),
  createdAt: z.number().optional().describe('Check-in timestamp (Unix)'),
  raw: z.any().optional().describe('Raw check-in payload')
});

export let userCheckin = SlateTrigger.create(spec, {
  name: 'User Check-in',
  key: 'user_checkin',
  description:
    'Triggers when an authorized user checks in to a venue via Foursquare. Requires the User Push API to be configured with the webhook URL in the Foursquare developer console.',
  instructions: [
    'Configure the webhook URL in the Foursquare Developer Console under the User Push API settings.',
    'The webhook endpoint must be HTTPS on port 443.',
    'Only fires for users who have authorized your application.'
  ]
})
  .input(checkinInputSchema)
  .output(
    z.object({
      checkinId: z.string().describe('Check-in ID'),
      userId: z.string().optional().describe('User who checked in'),
      userName: z.string().optional().describe('User display name'),
      venueFsqId: z.string().optional().describe('Venue Foursquare ID'),
      venueName: z.string().optional().describe('Venue name'),
      venueAddress: z.string().optional().describe('Venue formatted address'),
      venueLatitude: z.number().optional().describe('Venue latitude'),
      venueLongitude: z.number().optional().describe('Venue longitude'),
      venueCategories: z
        .array(
          z.object({
            categoryId: z.string().optional(),
            categoryName: z.string().optional()
          })
        )
        .optional()
        .describe('Venue categories'),
      shout: z.string().optional().describe('Check-in shout message'),
      createdAt: z.number().optional().describe('Check-in timestamp (Unix)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let checkin = body?.checkin;
      if (!checkin) {
        return { inputs: [] };
      }

      let venue = checkin.venue || {};
      let user = checkin.user || {};
      let categories = (venue.categories || []).map((c: any) => ({
        categoryId: c.id,
        categoryName: c.name
      }));

      let location = venue.location || {};

      return {
        inputs: [
          {
            checkinId: checkin.id || `checkin_${Date.now()}`,
            eventType: 'checkin',
            userId: user.id,
            userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
            venueFsqId: venue.id,
            venueName: venue.name,
            venueAddress: location.formattedAddress?.join(', ') || location.address,
            venueLatitude: location.lat,
            venueLongitude: location.lng,
            venueCategories: categories,
            shout: checkin.shout,
            createdAt: checkin.createdAt,
            raw: checkin
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'checkin.created',
        id: ctx.input.checkinId,
        output: {
          checkinId: ctx.input.checkinId,
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          venueFsqId: ctx.input.venueFsqId,
          venueName: ctx.input.venueName,
          venueAddress: ctx.input.venueAddress,
          venueLatitude: ctx.input.venueLatitude,
          venueLongitude: ctx.input.venueLongitude,
          venueCategories: ctx.input.venueCategories,
          shout: ctx.input.shout,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
