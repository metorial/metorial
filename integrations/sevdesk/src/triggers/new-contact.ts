import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is created in sevDesk.'
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID'),
      contactData: z.any().describe('Full contact data from sevDesk')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      name: z.string().optional().describe('Display name'),
      familyName: z.string().optional(),
      firstName: z.string().optional(),
      customerNumber: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SevdeskClient({ token: ctx.auth.token });

      let lastSeenId: string | undefined = ctx.state?.lastSeenId;
      let lastSeenTimestamp: string | undefined = ctx.state?.lastSeenTimestamp;

      let contacts = await client.listContacts({
        limit: 50,
        offset: 0
      });

      // Sort by ID descending (newest first) to find new contacts
      let sorted = (contacts ?? []).sort((a: any, b: any) => Number(b.id) - Number(a.id));

      let newContacts: any[] = [];
      for (let contact of sorted) {
        let cId = String(contact.id);
        if (lastSeenId && Number(cId) <= Number(lastSeenId)) break;
        newContacts.push(contact);
      }

      let updatedLastSeenId = sorted.length > 0 ? String(sorted[0].id) : lastSeenId;
      let updatedLastSeenTimestamp =
        sorted.length > 0 ? (sorted[0].create ?? lastSeenTimestamp) : lastSeenTimestamp;

      return {
        inputs: newContacts.map((c: any) => ({
          contactId: String(c.id),
          contactData: c
        })),
        updatedState: {
          lastSeenId: updatedLastSeenId,
          lastSeenTimestamp: updatedLastSeenTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.contactData;
      let displayName = c.name || [c.surename, c.familyname].filter(Boolean).join(' ') || '';

      return {
        type: 'contact.created',
        id: ctx.input.contactId,
        output: {
          contactId: ctx.input.contactId,
          name: displayName || undefined,
          familyName: c.familyname ?? undefined,
          firstName: c.surename ?? undefined,
          customerNumber: c.customerNumber ?? undefined,
          description: c.description ?? undefined,
          categoryId: c.category?.id ? String(c.category.id) : undefined,
          createdAt: c.create ?? undefined
        }
      };
    }
  })
  .build();
