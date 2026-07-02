import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let newUnsubscribe = SlateTrigger.create(spec, {
  name: 'Contact Unsubscribed',
  key: 'new_unsubscribe',
  description: 'Triggers when a contact unsubscribes from email communications.'
})
  .input(
    z.object({
      contactId: z.number().describe('Sendlane contact ID'),
      email: z.string().describe('Contact email address'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      phone: z.string().describe('Contact phone number'),
      createdAt: z.string().describe('When the contact was created')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Sendlane contact ID'),
      email: z.string().describe('Contact email address'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      phone: z.string().describe('Contact phone number'),
      createdAt: z.string().describe('When the contact was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SendlaneClient(ctx.auth.token);
      let state = ctx.state as { knownIds?: number[] } | null;
      let knownIds = new Set(state?.knownIds ?? []);

      let result = await client.listUnsubscribed(1, 50);
      let newUnsubscribes = result.data.filter(c => !knownIds.has(c.id));

      let updatedIds = [...knownIds];
      for (let contact of result.data) {
        if (!knownIds.has(contact.id)) {
          updatedIds.push(contact.id);
        }
      }

      // Keep only the most recent 500 IDs to avoid unbounded state growth
      let trimmedIds = updatedIds.length > 500 ? updatedIds.slice(-500) : updatedIds;

      return {
        inputs: newUnsubscribes.map(c => ({
          contactId: c.id,
          email: c.email ?? '',
          firstName: c.first_name ?? '',
          lastName: c.last_name ?? '',
          phone: c.phone ?? '',
          createdAt: c.created_at ?? ''
        })),
        updatedState: {
          knownIds: trimmedIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.unsubscribed',
        id: `unsubscribe-${ctx.input.contactId}`,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
