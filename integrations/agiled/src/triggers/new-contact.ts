import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContactTrigger = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact (account) is created in Agiled.'
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      contact: z.record(z.string(), z.unknown()).describe('Contact record from Agiled')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the new contact'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email'),
      companyName: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Phone number'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listContacts(1, 50);
      let contacts = result.data;

      let newContacts = lastKnownId ? contacts.filter(c => Number(c.id) > lastKnownId) : [];

      let maxId = contacts.reduce(
        (max, c) => Math.max(max, Number(c.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newContacts.map(c => ({
          contactId: String(c.id),
          contact: c
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.contact;
      return {
        type: 'contact.created',
        id: ctx.input.contactId,
        output: {
          contactId: ctx.input.contactId,
          name: (c.client_name as string | undefined) ?? (c.name as string | undefined),
          email: (c.client_email as string | undefined) ?? (c.email as string | undefined),
          companyName: c.company_name as string | undefined,
          phone: c.phone as string | undefined,
          createdAt: c.created_at as string | undefined
        }
      };
    }
  })
  .build();
