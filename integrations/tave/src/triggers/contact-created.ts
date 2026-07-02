import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

export let contactCreated = SlateTrigger.create(spec, {
  name: 'Contact Created',
  key: 'contact_created',
  description:
    'Fires when a new contact is created in Tave. Can be filtered by contact kind and brand.'
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      contactKind: z.string().optional().describe('Kind of contact'),
      brand: z.string().optional().describe('Brand of the contact'),
      createdAt: z.string().optional().describe('When the contact was created'),
      raw: z.any().optional().describe('Full contact record')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      contactKind: z
        .string()
        .optional()
        .describe('Kind of contact (e.g., individual, business)'),
      brand: z.string().optional().describe('Brand associated with the contact'),
      createdAt: z.string().optional().describe('Timestamp when the contact was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TavePublicClient(ctx.auth.token);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownIds = (ctx.state?.knownIds as string[] | undefined) ?? [];

      let params: { since?: string; page?: number; perPage?: number } = {
        perPage: 50
      };

      if (lastPolledAt) {
        params.since = lastPolledAt;
      }

      let result = await client.listContacts(params);
      let items = Array.isArray(result) ? result : (result?.data ?? result?.contacts ?? []);

      let newContacts = items.filter((c: any) => {
        let id = String(c.id ?? c.contact_id ?? '');
        return !knownIds.includes(id);
      });

      let newIds = newContacts.map((c: any) => String(c.id ?? c.contact_id ?? ''));
      let updatedKnownIds = [...knownIds, ...newIds].slice(-500);

      let inputs = newContacts.map((c: any) => ({
        contactId: String(c.id ?? c.contact_id ?? ''),
        firstName: c.first_name ?? c.firstName ?? undefined,
        lastName: c.last_name ?? c.lastName ?? undefined,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        contactKind: c.contact_kind ?? c.contactKind ?? undefined,
        brand: c.brand ?? undefined,
        createdAt: c.created_at ?? c.created ?? undefined,
        raw: c
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
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
          contactKind: ctx.input.contactKind,
          brand: ctx.input.brand,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
