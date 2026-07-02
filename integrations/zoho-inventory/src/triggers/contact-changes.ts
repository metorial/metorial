import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts (customers or vendors) are created or updated in Zoho Inventory. Polls for recently modified contacts.'
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID'),
      contactName: z.string().describe('Contact name'),
      contactType: z.string().optional().describe('Contact type (customer/vendor)'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email'),
      status: z.string().optional().describe('Contact status'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      contactName: z.string().describe('Contact name'),
      contactType: z.string().optional().describe('Contact type (customer/vendor)'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email'),
      status: z.string().optional().describe('Contact status'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let result = await client.listContacts({
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 25
      });

      let contacts = result.contacts || [];
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let newContacts: any[] = [];

      for (let contact of contacts) {
        if (
          lastPolledAt &&
          contact.last_modified_time &&
          contact.last_modified_time <= lastPolledAt
        ) {
          break;
        }
        newContacts.push(contact);
      }

      let updatedLastPolled =
        contacts.length > 0 && contacts[0].last_modified_time
          ? contacts[0].last_modified_time
          : lastPolledAt;

      return {
        inputs: newContacts.map((c: any) => ({
          contactId: String(c.contact_id),
          contactName: c.contact_name,
          contactType: c.contact_type ?? undefined,
          companyName: c.company_name ?? undefined,
          email: c.email ?? undefined,
          status: c.status ?? undefined,
          lastModifiedTime: c.last_modified_time ?? undefined
        })),
        updatedState: {
          lastPolledAt: updatedLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.updated',
        id: `contact-${ctx.input.contactId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          contactName: ctx.input.contactName,
          contactType: ctx.input.contactType,
          companyName: ctx.input.companyName,
          email: ctx.input.email,
          status: ctx.input.status,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
