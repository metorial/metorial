import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    '[Polling fallback] Triggers when contacts are created or updated in Freshdesk. Polls for new and recently modified contacts. For tickets, prefer Ticket Events (Webhook).'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of contact event'),
      contactId: z.number().describe('ID of the affected contact'),
      name: z.string().describe('Contact name'),
      email: z.string().nullable().describe('Contact email'),
      phone: z.string().nullable().describe('Contact phone'),
      companyId: z.number().nullable().describe('Associated company ID'),
      active: z.boolean().describe('Whether the contact is active'),
      createdAt: z.string().describe('Contact creation timestamp'),
      updatedAt: z.string().describe('Contact last update timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the affected contact'),
      name: z.string().describe('Contact name'),
      email: z.string().nullable().describe('Contact email'),
      phone: z.string().nullable().describe('Contact phone'),
      companyId: z.number().nullable().describe('Associated company ID'),
      active: z.boolean().describe('Whether the contact is active'),
      createdAt: z.string().describe('Contact creation timestamp'),
      updatedAt: z.string().describe('Contact last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreshdeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let state = ctx.state ?? {};
      let lastPollTime: string | null = state.lastPollTime ?? null;
      let knownContactIds: Record<string, boolean> = state.knownContactIds ?? {};

      let now = new Date().toISOString();

      let params: Record<string, any> = {};
      if (lastPollTime) {
        params.updatedSince = lastPollTime;
      }

      let contacts = await client.listContacts(params);

      let inputs = contacts.map((c: any) => {
        let isNew =
          !knownContactIds[String(c.id)] && (!lastPollTime || c.created_at >= lastPollTime);
        return {
          eventType: (isNew ? 'created' : 'updated') as 'created' | 'updated',
          contactId: c.id,
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? null,
          companyId: c.company_id ?? null,
          active: c.active ?? true,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        };
      });

      let updatedKnownIds: Record<string, boolean> = { ...knownContactIds };
      for (let c of contacts) {
        updatedKnownIds[String(c.id)] = true;
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownContactIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: `contact-${ctx.input.contactId}-${ctx.input.updatedAt}`,
        output: {
          contactId: ctx.input.contactId,
          name: ctx.input.name,
          email: ctx.input.email,
          phone: ctx.input.phone,
          companyId: ctx.input.companyId,
          active: ctx.input.active,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
