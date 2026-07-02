import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContacts = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contacts',
  description: 'Triggers when a new customer contact is created.'
})
  .input(
    z.object({
      contactEmail: z.string().nullable().optional().describe('Contact email'),
      contactName: z.string().nullable().optional().describe('Contact name'),
      friendlyName: z.string().nullable().optional().describe('Friendly display name'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom data attributes')
    })
  )
  .output(
    z.object({
      contactEmail: z.string().nullable().optional().describe('Contact email'),
      contactName: z.string().nullable().optional().describe('Contact name'),
      friendlyName: z.string().nullable().optional().describe('Friendly display name'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom data attributes')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        loginEmail: ctx.auth.loginEmail,
        brandSubdomain: ctx.config.brandSubdomain
      });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as string | undefined;

      let result = await client.listContacts({ sort: 'date' });
      let contacts = result.contacts || [];

      let newOnes = lastPolledAt
        ? contacts.filter((c: any) => c.created_at > lastPolledAt)
        : contacts;

      let now = new Date().toISOString();

      let inputs = newOnes.map((c: any) => ({
        contactEmail: c.email,
        contactName: c.name,
        friendlyName: c.friendly_name,
        createdAt: c.created_at,
        customAttributes: c.data
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id:
          ctx.input.contactEmail ||
          ctx.input.contactName ||
          ctx.input.createdAt ||
          String(Date.now()),
        output: {
          contactEmail: ctx.input.contactEmail,
          contactName: ctx.input.contactName,
          friendlyName: ctx.input.friendlyName,
          createdAt: ctx.input.createdAt,
          customAttributes: ctx.input.customAttributes
        }
      };
    }
  })
  .build();
