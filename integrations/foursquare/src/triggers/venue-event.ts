import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let venueEventInputSchema = z.object({
  eventId: z.string().describe('Event ID'),
  eventType: z
    .enum(['checkin', 'like', 'tip', 'photo'])
    .describe('Type of venue content event'),
  venueFsqId: z.string().optional().describe('Venue Foursquare ID'),
  venueName: z.string().optional().describe('Venue name'),
  venueAddress: z.string().optional().describe('Venue formatted address'),
  contentId: z.string().optional().describe('ID of the content (tip, photo, etc.)'),
  contentText: z.string().optional().describe('Content text (for tips)'),
  contentUrl: z.string().optional().describe('Content URL (for photos)'),
  createdAt: z.number().optional().describe('Event timestamp (Unix)'),
  raw: z.any().optional().describe('Raw event payload')
});

export let venueEvent = SlateTrigger.create(spec, {
  name: 'Venue Event',
  key: 'venue_event',
  description:
    'Triggers when content is added to a managed venue: check-ins, likes, tips, or photos. Requires the Venue Push API to be configured in the Foursquare developer console.',
  instructions: [
    'Configure the webhook URL in the Foursquare Developer Console under the Venue Push API settings.',
    'At least one venue manager must have authorized your application.',
    'Off-the-grid and opted-out check-ins are excluded.',
    'Responses are anonymous — private information like shouts is not included.'
  ]
})
  .input(venueEventInputSchema)
  .output(
    z.object({
      eventType: z
        .enum(['checkin', 'like', 'tip', 'photo'])
        .describe('Type of venue content event'),
      venueFsqId: z.string().optional().describe('Venue Foursquare ID'),
      venueName: z.string().optional().describe('Venue name'),
      venueAddress: z.string().optional().describe('Venue formatted address'),
      contentId: z.string().optional().describe('ID of the content'),
      contentText: z.string().optional().describe('Content text (for tips)'),
      contentUrl: z.string().optional().describe('Content URL (for photos)'),
      createdAt: z.number().optional().describe('Event timestamp (Unix)')
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

      let inputs: z.infer<typeof venueEventInputSchema>[] = [];

      // Venue push can include different types of content
      let venue = body?.venue || {};
      let venueId = venue.id;
      let venueName = venue.name;
      let location = venue.location || {};
      let venueAddress = location.formattedAddress?.join(', ') || location.address;

      // Check-in events
      if (body?.checkin) {
        let checkin = body.checkin;
        inputs.push({
          eventId: checkin.id || `venue_checkin_${Date.now()}`,
          eventType: 'checkin',
          venueFsqId: venueId,
          venueName,
          venueAddress,
          contentId: checkin.id,
          createdAt: checkin.createdAt,
          raw: body
        });
      }

      // Like events
      if (body?.like) {
        let like = body.like;
        inputs.push({
          eventId: like.id || `venue_like_${Date.now()}`,
          eventType: 'like',
          venueFsqId: venueId,
          venueName,
          venueAddress,
          contentId: like.id,
          createdAt: like.createdAt,
          raw: body
        });
      }

      // Tip events
      if (body?.tip) {
        let tip = body.tip;
        inputs.push({
          eventId: tip.id || `venue_tip_${Date.now()}`,
          eventType: 'tip',
          venueFsqId: venueId,
          venueName,
          venueAddress,
          contentId: tip.id,
          contentText: tip.text,
          createdAt: tip.createdAt,
          raw: body
        });
      }

      // Photo events
      if (body?.photo) {
        let photo = body.photo;
        let photoUrl =
          photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : undefined;
        inputs.push({
          eventId: photo.id || `venue_photo_${Date.now()}`,
          eventType: 'photo',
          venueFsqId: venueId,
          venueName,
          venueAddress,
          contentId: photo.id,
          contentUrl: photoUrl,
          createdAt: photo.createdAt,
          raw: body
        });
      }

      // If no specific content types matched, try to handle as generic event
      if (inputs.length === 0 && body) {
        inputs.push({
          eventId: `venue_event_${Date.now()}`,
          eventType: 'checkin',
          venueFsqId: venueId,
          venueName,
          venueAddress,
          createdAt: Math.floor(Date.now() / 1000),
          raw: body
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `venue.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          venueFsqId: ctx.input.venueFsqId,
          venueName: ctx.input.venueName,
          venueAddress: ctx.input.venueAddress,
          contentId: ctx.input.contentId,
          contentText: ctx.input.contentText,
          contentUrl: ctx.input.contentUrl,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
