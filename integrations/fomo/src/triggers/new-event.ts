import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEvent = SlateTrigger.create(spec, {
  name: 'New Event',
  key: 'new_event',
  description:
    'Triggers when a new Fomo notification event is created. Polls for new events and emits each new event detected since the last poll.'
})
  .input(
    z.object({
      eventId: z.number().describe('Unique ID of the event.'),
      eventTypeId: z.string().optional().describe('Template ID.'),
      externalId: z.string().optional().describe('External identifier.'),
      firstName: z.string().optional().describe('First name.'),
      emailAddress: z.string().optional().describe('Email address.'),
      city: z.string().optional().describe('City.'),
      province: z.string().optional().describe('Province.'),
      country: z.string().optional().describe('Country.'),
      title: z.string().optional().describe('Event title.'),
      url: z.string().optional().describe('Redirect URL.'),
      imageUrl: z.string().optional().describe('Image URL.'),
      createdAtToSecondsFromEpoch: z.number().optional().describe('Creation timestamp.'),
      message: z.string().optional().describe('Rendered notification message.'),
      link: z.string().optional().describe('Full notification link.'),
      customEventFieldsAttributes: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom event fields.')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Unique ID of the event.'),
      eventTypeId: z.string().optional().describe('Template ID.'),
      externalId: z.string().optional().describe('External identifier.'),
      firstName: z.string().optional().describe('First name.'),
      emailAddress: z.string().optional().describe('Email address.'),
      city: z.string().optional().describe('City.'),
      province: z.string().optional().describe('Province.'),
      country: z.string().optional().describe('Country.'),
      title: z.string().optional().describe('Event title.'),
      url: z.string().optional().describe('Redirect URL.'),
      imageUrl: z.string().optional().describe('Image URL.'),
      createdAtToSecondsFromEpoch: z.number().optional().describe('Creation timestamp.'),
      message: z.string().optional().describe('Rendered notification message.'),
      link: z.string().optional().describe('Full notification link.'),
      customEventFieldsAttributes: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom event fields.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.listEvents({ perPage: 30, page: 1 });

      let lastSeenTimestamp: number = ctx.state?.lastSeenTimestamp ?? 0;
      let lastSeenEventId: number = ctx.state?.lastSeenEventId ?? 0;

      let newEvents = result.events.filter(e => {
        let ts = e.createdAtToSecondsFromEpoch ?? 0;
        let eid = e.eventId ?? 0;
        if (ts > lastSeenTimestamp) return true;
        if (ts === lastSeenTimestamp && eid > lastSeenEventId) return true;
        return false;
      });

      let newLastSeenTimestamp = lastSeenTimestamp;
      let newLastSeenEventId = lastSeenEventId;

      for (let e of newEvents) {
        let ts = e.createdAtToSecondsFromEpoch ?? 0;
        let eid = e.eventId ?? 0;
        if (
          ts > newLastSeenTimestamp ||
          (ts === newLastSeenTimestamp && eid > newLastSeenEventId)
        ) {
          newLastSeenTimestamp = ts;
          newLastSeenEventId = eid;
        }
      }

      return {
        inputs: newEvents.map(e => ({
          eventId: e.eventId!,
          eventTypeId: e.eventTypeId,
          externalId: e.externalId,
          firstName: e.firstName,
          emailAddress: e.emailAddress,
          city: e.city,
          province: e.province,
          country: e.country,
          title: e.title,
          url: e.url,
          imageUrl: e.imageUrl,
          createdAtToSecondsFromEpoch: e.createdAtToSecondsFromEpoch,
          message: e.message,
          link: e.link,
          customEventFieldsAttributes: e.customEventFieldsAttributes
        })),
        updatedState: {
          lastSeenTimestamp: newLastSeenTimestamp,
          lastSeenEventId: newLastSeenEventId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'event.created',
        id: String(ctx.input.eventId),
        output: {
          eventId: ctx.input.eventId,
          eventTypeId: ctx.input.eventTypeId,
          externalId: ctx.input.externalId,
          firstName: ctx.input.firstName,
          emailAddress: ctx.input.emailAddress,
          city: ctx.input.city,
          province: ctx.input.province,
          country: ctx.input.country,
          title: ctx.input.title,
          url: ctx.input.url,
          imageUrl: ctx.input.imageUrl,
          createdAtToSecondsFromEpoch: ctx.input.createdAtToSecondsFromEpoch,
          message: ctx.input.message,
          link: ctx.input.link,
          customEventFieldsAttributes: ctx.input.customEventFieldsAttributes
        }
      };
    }
  })
  .build();
