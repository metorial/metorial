import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let contactEventTypes = ['Contact_Add', 'Contact_Update', 'Contact_Delete'] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggered when a customer contact is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      contactId: z.string().describe('ID of the affected contact'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the affected contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      accountId: z.string().optional().describe('Associated account ID'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of contactEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType === 'Contact_Update') {
            webhookData.includePrevState = true;
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch {
          // Continue with other events
        }
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          /* ignore */
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let contact = data.payload || data.contact || data;
      let contactId = contact.id || contact.contactId || data.contactId || '';

      return {
        inputs: [
          {
            eventType,
            contactId: String(contactId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, contactId, payload } = ctx.input;
      let contact = payload?.payload || payload?.contact || payload || {};

      let normalizedType = eventType
        .replace(/^Contact_/, 'contact.')
        .replace(/_/g, '_')
        .toLowerCase();

      return {
        type: normalizedType,
        id: `${contactId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          contactId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          accountId: contact.accountId,
          previousState: contact.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
