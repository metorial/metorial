import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = [
  'contact_created',
  'contact_changed',
  'contact_destroyed',
  'contact_archived',
  'contact_activated',
  'contact_merged',
  'contact_is_trusted',
  'contact_is_not_trusted',
  'contact_person_created',
  'contact_person_updated',
  'contact_person_destroyed'
] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggered when contacts are created, updated, deleted, archived, activated, merged, or when trust status changes. Also fires for contact person changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Moneybird event type'),
      webhookToken: z.string().optional().describe('Webhook verification token'),
      entity: z.any().describe('Full entity data from webhook'),
      state: z.string().optional().describe('New state of the entity'),
      administrationId: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      companyName: z.string().nullable().describe('Company name'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Email'),
      customerId: z.string().nullable().describe('Customer ID'),
      archived: z.boolean().nullable().describe('Whether the contact is archived')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...contactEventTypes
      ]);

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.action || 'unknown',
            webhookToken: data.token,
            entity: data.entity,
            state: data.state,
            administrationId: data.administration_id
              ? String(data.administration_id)
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.entity || {};
      let idempotencyKey = `${ctx.input.eventType}-${entity.id}-${Date.now()}`;

      return {
        type: ctx.input.eventType.replace(/_/g, '.'),
        id: idempotencyKey,
        output: {
          contactId: entity.id ? String(entity.id) : 'unknown',
          companyName: entity.company_name || null,
          firstName: entity.firstname || null,
          lastName: entity.lastname || null,
          email: entity.email || null,
          customerId: entity.customer_id || null,
          archived: entity.archived ?? null
        }
      };
    }
  });
