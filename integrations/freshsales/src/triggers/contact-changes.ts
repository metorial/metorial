import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts are created or updated in Freshsales. Requires a view ID that includes the contacts you want to monitor.'
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      isNew: z.boolean().describe('Whether this contact is newly created since last poll')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      jobTitle: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      leadScore: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let viewId = ctx.state?.viewId;
      if (!viewId) {
        let filters = await client.getContactFilters();
        let defaultFilter =
          filters.find((f: Record<string, any>) => f.is_default) || filters[0];
        if (!defaultFilter) {
          return { inputs: [], updatedState: ctx.state || {} };
        }
        viewId = defaultFilter.id;
      }

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let result = await client.listContacts(viewId, {
        sort: 'updated_at',
        sortType: 'desc',
        page: 1
      });

      let contacts = result.contacts || [];
      let newInputs: any[] = [];

      for (let contact of contacts) {
        if (lastPolledAt && contact.updated_at && contact.updated_at <= lastPolledAt) {
          break;
        }
        let isNew = !lastPolledAt || (contact.created_at && contact.created_at > lastPolledAt);
        newInputs.push({
          contactId: contact.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          displayName: contact.display_name,
          email: contact.email,
          jobTitle: contact.job_title,
          city: contact.city,
          country: contact.country,
          leadScore: contact.lead_score,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
          isNew
        });
      }

      let updatedLastPolledAt =
        contacts.length > 0 && contacts[0]?.updated_at ? contacts[0].updated_at : lastPolledAt;

      return {
        inputs: newInputs,
        updatedState: {
          viewId,
          lastPolledAt: updatedLastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'contact.created' : 'contact.updated';
      return {
        type: eventType,
        id: `${ctx.input.contactId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          displayName: ctx.input.displayName,
          email: ctx.input.email,
          jobTitle: ctx.input.jobTitle,
          city: ctx.input.city,
          country: ctx.input.country,
          leadScore: ctx.input.leadScore,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
