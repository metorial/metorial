import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let naturalDisasterAlert = SlateTrigger.create(spec, {
  name: 'Natural Disaster Alert',
  key: 'natural_disaster_alert',
  description:
    'Polls for new natural disaster events (earthquakes, floods, cyclones, etc.) at a specified location, continent, or country. Triggers when new events are detected.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().optional().describe('Disaster event type code'),
      title: z.string().optional().describe('Event title'),
      severity: z.string().optional().describe('Event severity'),
      rawEvent: z.any().describe('Full event payload')
    })
  )
  .output(
    z
      .object({
        eventId: z.string().describe('Unique event identifier'),
        eventType: z
          .string()
          .optional()
          .describe('Disaster type (EQ, TN, TC, WF, FL, ET, DR, SW, SI, VO, LS)'),
        title: z.string().optional().describe('Event title or description'),
        severity: z.string().optional().describe('Severity level'),
        lat: z.number().optional().describe('Event latitude'),
        lng: z.number().optional().describe('Event longitude'),
        country: z.string().optional().describe('Affected country'),
        startedAt: z.string().optional().describe('Event start time'),
        updatedAt: z.string().optional().describe('Last update time')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        language: ctx.config.language
      });

      let lat = ctx.state?.lat as number | undefined;
      let lng = ctx.state?.lng as number | undefined;
      let countryCode = ctx.state?.countryCode as string | undefined;
      let continent = ctx.state?.continent as string | undefined;
      let seenEventIds = (ctx.state?.seenEventIds as string[]) || [];

      let result: any;

      if (lat !== undefined && lng !== undefined) {
        result = await client.getDisastersByLatLng(lat, lng);
      } else if (countryCode) {
        result = await client.getDisastersByCountryCode(countryCode);
      } else if (continent) {
        result = await client.getDisastersByContinent(continent);
      } else {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let disasters = result.data || [];
      let newEvents: any[] = [];
      let updatedSeenIds = [...seenEventIds];

      for (let disaster of disasters) {
        let id =
          disaster.event_id ||
          disaster.eventId ||
          disaster._id ||
          JSON.stringify(disaster).slice(0, 64);
        if (!seenEventIds.includes(id)) {
          updatedSeenIds.push(id);
          newEvents.push({
            eventId: id,
            eventType: disaster.event_type || disaster.eventType,
            title: disaster.title || disaster.name || disaster.description,
            severity: disaster.severity || disaster.alertlevel,
            rawEvent: disaster
          });
        }
      }

      // Keep only last 500 event IDs to prevent unbounded growth
      if (updatedSeenIds.length > 500) {
        updatedSeenIds = updatedSeenIds.slice(-500);
      }

      return {
        inputs: newEvents,
        updatedState: {
          ...ctx.state,
          seenEventIds: updatedSeenIds,
          lastChecked: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent || {};

      return {
        type: `disaster.${(ctx.input.eventType || 'unknown').toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          title: ctx.input.title,
          severity: ctx.input.severity,
          lat: raw.lat || raw.latitude,
          lng: raw.lng || raw.lon || raw.longitude,
          country: raw.country || raw.countryCode,
          startedAt: raw.startDate || raw.created_at || raw.createdAt,
          updatedAt: raw.updatedAt || raw.updated_at
        }
      };
    }
  })
  .build();
