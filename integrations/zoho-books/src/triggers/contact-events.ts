import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let contactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Polls for new or updated customers and vendors. Detects contact creation and modifications.'
})
  .input(
    z.object({
      contactId: z.string(),
      eventType: z.string(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      email: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      email: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownContacts = (ctx.state?.knownContacts || {}) as Record<string, boolean>;

      let query: Record<string, any> = {
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 200
      };

      if (lastPollTime) {
        query.last_modified_time = lastPollTime;
      }

      let resp = await client.listContacts(query);
      let contacts = resp.contacts || [];
      let inputs: any[] = [];
      let newKnownContacts = { ...knownContacts };

      for (let c of contacts) {
        let isKnown = knownContacts[c.contact_id];
        let eventType = isKnown ? 'updated' : 'created';

        inputs.push({
          contactId: c.contact_id,
          eventType,
          contactName: c.contact_name,
          companyName: c.company_name,
          contactType: c.contact_type,
          status: c.status,
          email: c.email,
          lastModifiedTime: c.last_modified_time
        });

        newKnownContacts[c.contact_id] = true;
      }

      let newPollTime = contacts.length > 0 ? contacts[0].last_modified_time : lastPollTime;

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownContacts: newKnownContacts
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: `${ctx.input.contactId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          contactName: ctx.input.contactName,
          companyName: ctx.input.companyName,
          contactType: ctx.input.contactType,
          status: ctx.input.status,
          email: ctx.input.email,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
