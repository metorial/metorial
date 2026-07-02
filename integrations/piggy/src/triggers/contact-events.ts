import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CONTACT_EVENT_TYPES = [
  'contact_created',
  'contact_updated',
  'contact_identifier_created'
] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is created, updated, or a new contact identifier is created.'
})
  .input(
    z.object({
      eventType: z.enum(CONTACT_EVENT_TYPES).describe('Type of contact event'),
      contactUuid: z.string().optional().describe('UUID of the affected contact'),
      webhookUuid: z
        .string()
        .optional()
        .describe('UUID of the webhook event for deduplication'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('UUID of the contact'),
      email: z.string().optional().describe('Contact email address'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      creditBalance: z.number().optional().describe('Contact credit balance'),
      identifierValue: z
        .string()
        .optional()
        .describe('Contact identifier value (for identifier events)'),
      createdAt: z.string().optional().describe('Creation or update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ eventType: string; subscriptionUuid: string }> = [];

      for (let eventType of CONTACT_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription({
            name: `Slates - ${eventType}`,
            eventType,
            url: ctx.input.webhookBaseUrl,
            ...(eventType === 'contact_updated'
              ? { attributes: ['email', 'first_name', 'last_name', 'phone'] }
              : {})
          });
          let sub = result.data || result;
          registrations.push({ eventType, subscriptionUuid: sub.uuid });
        } catch (_err) {
          // Skip if event type is not supported
        }
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        subscriptions: Array<{ subscriptionUuid: string }>;
      };

      for (let sub of details.subscriptions || []) {
        try {
          await client.deleteWebhookSubscription(sub.subscriptionUuid);
        } catch {
          /* ignore errors during cleanup */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type || body.type || 'contact_created';
      let contactUuid = body.data?.uuid || body.data?.contact?.uuid || body.uuid || '';

      return {
        inputs: [
          {
            eventType: CONTACT_EVENT_TYPES.includes(eventType) ? eventType : 'contact_created',
            contactUuid,
            webhookUuid: body.uuid || body.id || `${eventType}-${contactUuid}-${Date.now()}`,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, contactUuid, rawPayload } = ctx.input;
      let data = rawPayload?.data || rawPayload || {};

      let output: any = {
        contactUuid: contactUuid || data.uuid || data.contact?.uuid || '',
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        creditBalance: data.credit_balance?.balance,
        createdAt: data.created_at || data.updated_at
      };

      if (eventType === 'contact_identifier_created') {
        output.identifierValue = data.value || data.contact_identifier_value;
        output.contactUuid = data.contact?.uuid || contactUuid || '';
      }

      // Fetch additional data if we only have a UUID
      if (output.contactUuid && !output.email) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let result = await client.getContact(output.contactUuid);
          let contact = result.data || result;
          output.email = output.email || contact.email;
          output.firstName = output.firstName || contact.first_name;
          output.lastName = output.lastName || contact.last_name;
          output.creditBalance = output.creditBalance ?? contact.credit_balance?.balance;
        } catch {
          /* contact data enrichment failed */
        }
      }

      return {
        type: `contact.${eventType.replace('contact_', '')}`,
        id: ctx.input.webhookUuid || `${eventType}-${output.contactUuid}-${Date.now()}`,
        output
      };
    }
  })
  .build();
