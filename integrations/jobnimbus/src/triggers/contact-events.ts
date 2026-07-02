import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contacts are created or updated in JobNimbus. Polls for recently modified contacts.'
})
  .input(
    z.object({
      contactId: z.string().describe('Unique JobNimbus ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
      company: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address'),
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      tags: z.array(z.string()).optional().describe('Tags'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique JobNimbus ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
      company: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address'),
      statusName: z.string().optional().describe('Current workflow status'),
      recordTypeName: z.string().optional().describe('Workflow type name'),
      tags: z.array(z.string()).optional().describe('Tags'),
      salesRepName: z.string().optional().describe('Sales rep name'),
      dateCreated: z.number().describe('Unix timestamp of creation'),
      dateUpdated: z.number().describe('Unix timestamp of last update')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as number | undefined;
      let now = Math.floor(Date.now() / 1000);

      let filter = lastPolledAt
        ? { must: [{ range: { date_updated: { gte: lastPolledAt } } }] }
        : undefined;

      let result = await client.listContacts({
        size: 100,
        filter
      });

      let inputs = (result.results || []).map((c: any) => ({
        contactId: c.jnid,
        firstName: c.first_name,
        lastName: c.last_name,
        displayName: c.display_name,
        company: c.company,
        email: c.email,
        statusName: c.status_name,
        recordTypeName: c.record_type_name,
        tags: c.tags,
        salesRepName: c.sales_rep_name,
        dateCreated: c.date_created,
        dateUpdated: c.date_updated
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.dateCreated === ctx.input.dateUpdated;
      let eventType = isNew ? 'contact.created' : 'contact.updated';

      return {
        type: eventType,
        id: `${ctx.input.contactId}-${ctx.input.dateUpdated}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          displayName: ctx.input.displayName,
          company: ctx.input.company,
          email: ctx.input.email,
          statusName: ctx.input.statusName,
          recordTypeName: ctx.input.recordTypeName,
          tags: ctx.input.tags,
          salesRepName: ctx.input.salesRepName,
          dateCreated: ctx.input.dateCreated,
          dateUpdated: ctx.input.dateUpdated
        }
      };
    }
  })
  .build();
