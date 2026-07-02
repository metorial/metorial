import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is added to your Sendlane account.'
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
      let state = ctx.state as { lastSeenId?: number } | null;
      let lastSeenId = state?.lastSeenId ?? 0;

      let result = await client.listContacts(1, 50);
      let newContacts = result.data.filter(c => c.id > lastSeenId);

      let maxId = lastSeenId;
      for (let contact of result.data) {
        if (contact.id > maxId) {
          maxId = contact.id;
        }
      }

      return {
        inputs: newContacts.map(c => ({
          contactId: c.id,
          email: c.email ?? '',
          firstName: c.first_name ?? '',
          lastName: c.last_name ?? '',
          phone: c.phone ?? '',
          createdAt: c.created_at ?? ''
        })),
        updatedState: {
          lastSeenId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: `contact-${ctx.input.contactId}`,
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
