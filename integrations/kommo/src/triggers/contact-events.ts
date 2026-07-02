import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let CONTACT_WEBHOOK_SETTINGS = [
  'add_contact',
  'update_contact',
  'delete_contact',
  'restore_contact',
  'responsible_contact',
  'note_contact'
];

export let contactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is added, updated, deleted, restored, changes responsible user, or receives a note.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      contactId: z.number().describe('Contact ID'),
      contactName: z.string().optional().describe('Contact name'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Contact creation timestamp'),
      updatedAt: z.number().optional().describe('Contact update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      contactName: z.string().optional().describe('Contact name'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Contact creation timestamp'),
      updatedAt: z.number().optional().describe('Contact update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let webhookUrl = ctx.input.webhookBaseUrl;
      await client.createWebhook(webhookUrl, CONTACT_WEBHOOK_SETTINGS);

      return {
        registrationDetails: { destination: webhookUrl, settings: CONTACT_WEBHOOK_SETTINGS }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      await client.deleteWebhook(ctx.input.registrationDetails.destination);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let jsonStr = params.get('') || text;
        body = JSON.parse(jsonStr);
      } catch {
        try {
          body = await ctx.request.json();
        } catch {
          return { inputs: [] };
        }
      }

      let inputs: any[] = [];

      let eventTypes: Record<string, string> = {
        add_contact: 'contact.added',
        update_contact: 'contact.updated',
        delete_contact: 'contact.deleted',
        restore_contact: 'contact.restored',
        responsible_contact: 'contact.responsible_changed',
        note_contact: 'contact.note_added'
      };

      for (let [webhookKey, eventType] of Object.entries(eventTypes)) {
        let eventData = body[webhookKey];
        if (!eventData) continue;

        let items = Array.isArray(eventData) ? eventData : [eventData];
        for (let item of items) {
          inputs.push({
            eventType,
            contactId: Number(item.id),
            contactName: item.name,
            responsibleUserId:
              item.responsible_user_id != null ? Number(item.responsible_user_id) : undefined,
            createdAt: item.created_at != null ? Number(item.created_at) : undefined,
            updatedAt: item.updated_at != null ? Number(item.updated_at) : undefined,
            accountId: body.account_id != null ? Number(body.account_id) : undefined,
            customFields: item.custom_fields
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.contactId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          contactName: ctx.input.contactName,
          responsibleUserId: ctx.input.responsibleUserId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          accountId: ctx.input.accountId,
          customFields: ctx.input.customFields
        }
      };
    }
  })
  .build();
