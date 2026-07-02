import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { mapEvent } from '../lib/mappers';
import { spec } from '../spec';

export let newEventsTrigger = SlateTrigger.create(spec, {
  name: 'New Events',
  key: 'new_events',
  description:
    'Polls for newly published events on Ticketmaster. Detects events that have appeared since the last poll based on date sorting.'
})
  .input(
    z.object({
      eventId: z.string().describe('Ticketmaster event ID'),
      name: z.string(),
      url: z.string(),
      startDate: z.string(),
      startLocalDate: z.string(),
      startLocalTime: z.string(),
      statusCode: z.string(),
      venueName: z.string(),
      venueCity: z.string(),
      venueCountryCode: z.string(),
      attractionNames: z.array(z.string()),
      segmentName: z.string(),
      genreName: z.string(),
      rawEvent: z.any()
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      name: z.string(),
      url: z.string(),
      startDate: z.string(),
      startLocalDate: z.string(),
      startLocalTime: z.string(),
      statusCode: z.string(),
      venueName: z.string(),
      venueCity: z.string(),
      venueCountryCode: z.string(),
      attractionNames: z.array(z.string()),
      segmentName: z.string(),
      genreName: z.string(),
      priceRanges: z.array(
        z.object({
          currency: z.string(),
          min: z.number().nullable(),
          max: z.number().nullable()
        })
      ),
      images: z.array(
        z.object({
          url: z.string(),
          width: z.number().nullable(),
          height: z.number().nullable()
        })
      )
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DiscoveryClient({
        token: ctx.auth.token,
        countryCode: ctx.config.countryCode,
        locale: ctx.config.locale
      });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];

      let now = new Date();
      let searchParams: any = {
        sort: 'date,desc',
        size: 50
      };

      if (lastPolledAt) {
        searchParams.startDateTime = lastPolledAt;
      }

      let response = await client.searchEvents(searchParams);
      let rawEvents = response?._embedded?.events || [];

      let newEvents = rawEvents.filter((e: any) => !seenIds.includes(e.id));

      let inputs = newEvents.map((e: any) => {
        let mapped = mapEvent(e);
        return {
          eventId: e.id || '',
          name: mapped?.name || '',
          url: mapped?.url || '',
          startDate: mapped?.startDate || '',
          startLocalDate: mapped?.startLocalDate || '',
          startLocalTime: mapped?.startLocalTime || '',
          statusCode: mapped?.statusCode || '',
          venueName: mapped?.venue?.name || '',
          venueCity: mapped?.venue?.city || '',
          venueCountryCode: mapped?.venue?.countryCode || '',
          attractionNames: mapped?.attractions?.map((a: any) => a.name) || [],
          segmentName: mapped?.classifications?.[0]?.segmentName || '',
          genreName: mapped?.classifications?.[0]?.genreName || '',
          rawEvent: e
        };
      });

      let updatedSeenIds = [
        ...new Set([...seenIds.slice(-500), ...rawEvents.map((e: any) => e.id)])
      ];

      return {
        inputs,
        updatedState: {
          lastPolledAt: now.toISOString(),
          seenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let event = ctx.input.rawEvent;
      let mapped = mapEvent(event);

      return {
        type: 'event.discovered',
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          name: ctx.input.name,
          url: ctx.input.url,
          startDate: ctx.input.startDate,
          startLocalDate: ctx.input.startLocalDate,
          startLocalTime: ctx.input.startLocalTime,
          statusCode: ctx.input.statusCode,
          venueName: ctx.input.venueName,
          venueCity: ctx.input.venueCity,
          venueCountryCode: ctx.input.venueCountryCode,
          attractionNames: ctx.input.attractionNames,
          segmentName: ctx.input.segmentName,
          genreName: ctx.input.genreName,
          priceRanges: (mapped?.priceRanges || []).map((p: any) => ({
            currency: p.currency || '',
            min: p.min ?? null,
            max: p.max ?? null
          })),
          images: (mapped?.images || []).slice(0, 5).map((img: any) => ({
            url: img.url || '',
            width: img.width ?? null,
            height: img.height ?? null
          }))
        }
      };
    }
  })
  .build();
