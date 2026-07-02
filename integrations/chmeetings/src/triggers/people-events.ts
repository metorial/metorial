import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let peopleEvents = SlateTrigger.create(spec, {
  name: 'People Events',
  key: 'people_events',
  description: `Triggered when a person record is created, updated, or deleted in ChMeetings. Configure the webhook endpoint in ChMeetings under Settings > Integrations > Webhooks.`
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of people event'),
      eventId: z.string().describe('Unique event identifier'),
      person: z
        .record(z.string(), z.unknown())
        .describe('Person data from the webhook payload')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the affected person'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      email: z.string().optional().describe('Email address'),
      mobile: z.string().optional().describe('Mobile phone number'),
      person: z.record(z.string(), z.unknown()).describe('Full person data from the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (body.event_type ?? body.eventType ?? body.type ?? '') as string;
      let normalizedType: 'created' | 'updated' | 'deleted' = 'updated';
      if (
        eventType.toLowerCase().includes('created') ||
        eventType.toLowerCase().includes('create')
      ) {
        normalizedType = 'created';
      } else if (
        eventType.toLowerCase().includes('deleted') ||
        eventType.toLowerCase().includes('delete')
      ) {
        normalizedType = 'deleted';
      } else if (
        eventType.toLowerCase().includes('updated') ||
        eventType.toLowerCase().includes('update')
      ) {
        normalizedType = 'updated';
      }

      let personData = (body.data ?? body.person ?? body.payload ?? body) as Record<
        string,
        unknown
      >;
      let personId = personData.id ?? body.person_id ?? body.personId ?? '';
      let eventId = String(
        body.id ??
          body.event_id ??
          body.eventId ??
          `${normalizedType}-${personId}-${Date.now()}`
      );

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId,
            person: personData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let person = ctx.input.person;
      let personId = Number(person.id ?? person.person_id ?? 0);

      return {
        type: `person.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          personId,
          firstName: person.first_name as string | undefined,
          lastName: person.last_name as string | undefined,
          email: person.email as string | undefined,
          mobile: person.mobile as string | undefined,
          person
        }
      };
    }
  })
  .build();
