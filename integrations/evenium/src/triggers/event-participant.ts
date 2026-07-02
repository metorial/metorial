import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventParticipant = SlateTrigger.create(spec, {
  name: 'New or Updated Participant',
  key: 'event_participant',
  description:
    'Triggers when a participant is added or updated on a specific Evenium event. Detects both new participants and modifications to existing ones.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']),
      contactId: z.string(),
      eventId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      company: z.string().optional(),
      gender: z.string().optional(),
      status: z.string().optional(),
      lastUpdate: z.string().optional(),
      categoryLabel: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID of the participant'),
      eventId: z.string().describe('Event ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      company: z.string().optional().describe('Company name'),
      gender: z.string().optional().describe('Gender'),
      status: z.string().optional().describe('Registration status'),
      lastUpdate: z.string().optional().describe('Last update timestamp'),
      categoryLabel: z.string().optional().describe('Category label')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownParticipants =
        (ctx.state?.knownParticipants as Record<string, string> | undefined) ?? {};

      // Get all events to poll participants from
      let eventsResult = await client.listEvents();
      let allInputs: Array<{
        changeType: 'created' | 'updated';
        contactId: string;
        eventId: string;
        firstName: string;
        lastName: string;
        email: string;
        company?: string;
        gender?: string;
        status?: string;
        lastUpdate?: string;
        categoryLabel?: string;
      }> = [];

      let updatedKnown = { ...knownParticipants };

      for (let event of eventsResult.events) {
        let guestsResult = await client.listGuests(event.id, {
          since: lastPollTime
        });

        for (let guest of guestsResult.guests) {
          let key = `${event.id}:${guest.contactId}`;
          let previousUpdate = knownParticipants[key];
          let isNew = !previousUpdate;
          let isUpdated = !isNew && guest.lastUpdate && guest.lastUpdate !== previousUpdate;

          if (isNew || isUpdated) {
            allInputs.push({
              changeType: isNew ? 'created' : 'updated',
              contactId: guest.contactId,
              eventId: guest.eventId,
              firstName: guest.firstName,
              lastName: guest.lastName,
              email: guest.email,
              company: guest.company,
              gender: guest.gender,
              status: guest.status,
              lastUpdate: guest.lastUpdate,
              categoryLabel:
                guest.categoryLabel ??
                (typeof guest.category === 'object' ? guest.category?.label : guest.category)
            });
          }

          updatedKnown[key] = guest.lastUpdate ?? new Date().toISOString();
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownParticipants: updatedKnown
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `participant.${ctx.input.changeType}`,
        id: `${ctx.input.eventId}:${ctx.input.contactId}:${ctx.input.lastUpdate ?? Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          eventId: ctx.input.eventId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          company: ctx.input.company,
          gender: ctx.input.gender,
          status: ctx.input.status,
          lastUpdate: ctx.input.lastUpdate,
          categoryLabel: ctx.input.categoryLabel
        }
      };
    }
  })
  .build();
