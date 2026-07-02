import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: '[Polling fallback] Triggers when a new contact is created in SuiteDash CRM.'
})
  .input(
    z.object({
      contactUid: z.string().describe('UID of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email of the contact'),
      createdAt: z.string().optional().describe('Timestamp when the contact was created'),
      raw: z.record(z.string(), z.unknown()).describe('Full contact record')
    })
  )
  .output(
    z.object({
      contactUid: z.string().describe('UID of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email of the contact'),
      createdAt: z.string().optional().describe('Timestamp when the contact was created'),
      raw: z.record(z.string(), z.unknown()).describe('Full contact record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        publicId: ctx.auth.publicId,
        secretKey: ctx.auth.secretKey
      });

      let contacts = await client.listAllContacts();
      let state = ctx.input.state as Record<string, unknown> | null;
      let lastSeenTimestamp = state?.lastSeenTimestamp as string | undefined;

      let newContacts = contacts.filter(contact => {
        let created = contact.created as string | undefined;
        if (!created || !lastSeenTimestamp) return true;
        return created > lastSeenTimestamp;
      });

      let maxTimestamp = lastSeenTimestamp;
      for (let contact of contacts) {
        let created = contact.created as string | undefined;
        if (created && (!maxTimestamp || created > maxTimestamp)) {
          maxTimestamp = created;
        }
      }

      let inputs = newContacts.map(contact => ({
        contactUid: (contact.uid as string) ?? '',
        firstName: contact.first_name as string | undefined,
        lastName: contact.last_name as string | undefined,
        email: contact.email as string | undefined,
        createdAt: contact.created as string | undefined,
        raw: contact
      }));

      return {
        inputs: lastSeenTimestamp ? inputs : [],
        updatedState: {
          lastSeenTimestamp: maxTimestamp ?? lastSeenTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: ctx.input.contactUid,
        output: {
          contactUid: ctx.input.contactUid,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          createdAt: ctx.input.createdAt,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
