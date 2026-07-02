import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { spec } from '../spec';

export let eventStatusChangesTrigger = SlateTrigger.create(spec, {
  name: 'Event Status Changes',
  key: 'event_status_changes',
  description:
    'Polls for status changes on recently discovered events. Detects when events go onsale, offsale, get canceled, postponed, or rescheduled.'
})
  .input(
    z.object({
      eventId: z.string(),
      name: z.string(),
      previousStatus: z.string(),
      currentStatus: z.string(),
      url: z.string(),
      startDate: z.string(),
      venueName: z.string()
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      name: z.string(),
      previousStatus: z.string().describe('Previous event status'),
      currentStatus: z
        .string()
        .describe('New event status: onsale, offsale, canceled, postponed, rescheduled'),
      url: z.string(),
      startDate: z.string(),
      venueName: z.string()
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

      let previousStatuses = (ctx.state?.statuses as Record<string, string>) || {};
      let trackedEventIds = Object.keys(previousStatuses);

      // On first run, seed state by fetching recent events
      if (trackedEventIds.length === 0) {
        let response = await client.searchEvents({ sort: 'date,asc', size: 50 });
        let rawEvents = response?._embedded?.events || [];
        let newStatuses: Record<string, string> = {};
        for (let e of rawEvents) {
          newStatuses[e.id] = e.dates?.status?.code || '';
        }
        return {
          inputs: [],
          updatedState: { statuses: newStatuses }
        };
      }

      let inputs: Array<{
        eventId: string;
        name: string;
        previousStatus: string;
        currentStatus: string;
        url: string;
        startDate: string;
        venueName: string;
      }> = [];

      let updatedStatuses: Record<string, string> = { ...previousStatuses };

      for (let eventId of trackedEventIds) {
        try {
          let event = await client.getEventDetails(eventId);
          let currentStatus = event?.dates?.status?.code || '';
          let previousStatus = previousStatuses[eventId] || '';

          updatedStatuses[eventId] = currentStatus;

          if (previousStatus && currentStatus && previousStatus !== currentStatus) {
            inputs.push({
              eventId,
              name: event?.name || '',
              previousStatus,
              currentStatus,
              url: event?.url || '',
              startDate: event?.dates?.start?.dateTime || event?.dates?.start?.localDate || '',
              venueName: event?._embedded?.venues?.[0]?.name || ''
            });
          }
        } catch (_err) {
          // Event may no longer exist, remove from tracking
          delete updatedStatuses[eventId];
        }
      }

      // Also discover new events to track
      let response = await client.searchEvents({ sort: 'date,asc', size: 20 });
      let rawEvents = response?._embedded?.events || [];
      for (let e of rawEvents) {
        if (!updatedStatuses[e.id]) {
          updatedStatuses[e.id] = e.dates?.status?.code || '';
        }
      }

      // Limit tracked events to prevent unbounded growth
      let statusEntries = Object.entries(updatedStatuses);
      if (statusEntries.length > 200) {
        updatedStatuses = Object.fromEntries(statusEntries.slice(-200));
      }

      return {
        inputs,
        updatedState: {
          statuses: updatedStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'event.status_changed',
        id: `${ctx.input.eventId}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          eventId: ctx.input.eventId,
          name: ctx.input.name,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus,
          url: ctx.input.url,
          startDate: ctx.input.startDate,
          venueName: ctx.input.venueName
        }
      };
    }
  })
  .build();
