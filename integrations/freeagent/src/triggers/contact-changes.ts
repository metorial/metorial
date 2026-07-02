import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description: 'Polls for new or updated contacts in FreeAgent.'
})
  .input(
    z.object({
      contactId: z.string().describe('FreeAgent contact ID'),
      organisationName: z.string().optional().describe('Organisation name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      status: z.string().optional().describe('Contact status'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full contact payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('FreeAgent contact ID'),
      organisationName: z.string().optional().describe('Organisation name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      status: z.string().optional().describe('Contact status'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreeAgentClient({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let contacts = await client.listContacts({
        updatedSince: lastPolled
      });

      let now = new Date().toISOString();

      let inputs = contacts.map((c: any) => {
        let url = c.url || '';
        let contactId = url.split('/').pop() || '';
        return {
          contactId,
          organisationName: c.organisation_name,
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.email,
          status: c.status,
          updatedAt: c.updated_at,
          createdAt: c.created_at,
          raw: c
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'created' : 'updated';

      return {
        type: `contact.${eventType}`,
        id: `${ctx.input.contactId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          organisationName: ctx.input.organisationName,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          status: ctx.input.status,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
