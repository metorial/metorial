import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is added to your DialMyCalls account.'
})
  .input(
    z.object({
      contactId: z.string().describe('Unique ID of the contact.'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique ID of the contact.'),
      firstName: z.string().optional().describe('Contact first name.'),
      lastName: z.string().optional().describe('Contact last name.'),
      phone: z.string().optional().describe('Contact phone number.'),
      email: z.string().optional().describe('Contact email address.'),
      createdAt: z.string().optional().describe('When the contact was created.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let contacts = await client.listContacts();

      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let lastSeenCreatedAt = ctx.state?.lastSeenCreatedAt as string | undefined;

      let newContacts = contacts.filter(c => {
        if (!c.id) return false;
        if (lastSeenCreatedAt && c.created_at && c.created_at <= lastSeenCreatedAt) {
          return c.created_at === lastSeenCreatedAt && c.id !== lastSeenId;
        }
        return (
          !lastSeenCreatedAt || (c.created_at != null && c.created_at > lastSeenCreatedAt)
        );
      });

      let updatedLastSeenId = lastSeenId;
      let updatedLastSeenCreatedAt = lastSeenCreatedAt;

      if (newContacts.length > 0) {
        let newest = newContacts.reduce((latest, c) => {
          if (!latest.created_at) return c;
          if (!c.created_at) return latest;
          return c.created_at > latest.created_at ? c : latest;
        }, newContacts[0]!);
        updatedLastSeenId = newest.id;
        updatedLastSeenCreatedAt = newest.created_at;
      }

      return {
        inputs: newContacts.map(c => ({
          contactId: c.id!,
          firstName: c.firstname,
          lastName: c.lastname,
          phone: c.phone,
          email: c.email,
          createdAt: c.created_at
        })),
        updatedState: {
          lastSeenId: updatedLastSeenId,
          lastSeenCreatedAt: updatedLastSeenCreatedAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: ctx.input.contactId,
        output: {
          contactId: ctx.input.contactId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          email: ctx.input.email,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
