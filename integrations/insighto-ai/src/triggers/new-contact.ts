import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is created in the system.'
})
  .input(
    z.object({
      contactId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listContacts({ page: 1, size: 50 });
      let items = result.data || result.items || result;
      let list = Array.isArray(items) ? items : [];

      let knownIds: string[] = ctx.state?.knownIds || [];
      let newContacts = list.filter((c: any) => !knownIds.includes(c.id));

      let updatedKnownIds = list.map((c: any) => c.id).slice(0, 200);

      return {
        inputs: newContacts.map((c: any) => ({
          contactId: c.id,
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.email,
          phone: c.phone,
          createdAt: c.created_at
        })),
        updatedState: {
          knownIds: updatedKnownIds
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
          email: ctx.input.email,
          phone: ctx.input.phone,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
