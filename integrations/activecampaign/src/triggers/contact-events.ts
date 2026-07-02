import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = [
  'subscribe',
  'unsubscribe',
  'update',
  'contact_tag_added',
  'contact_tag_removed',
  'subscriber_note',
  'list_add'
] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is subscribed, unsubscribed, updated, tagged, or added to a list.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the affected contact'),
      email: z.string().optional().describe('Email of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      listId: z.string().optional().describe('ID of the related list'),
      tagId: z.string().optional().describe('ID of the related tag'),
      tagName: z.string().optional().describe('Name of the related tag'),
      initiatedBy: z
        .string()
        .optional()
        .describe('Who initiated the action (public, admin, api, system)'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      let result = await client.createWebhook({
        name: 'Slates Contact Events',
        url: ctx.input.webhookBaseUrl,
        events: [...contactEventTypes],
        sources: ['public', 'admin', 'api', 'system']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let eventType = data.type || data.type || 'unknown';

      return {
        inputs: [
          {
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload as Record<string, any>;

      let contactId = String(p['contact[id]'] || p.contact_id || p.contactId || '');
      let email = String(p['contact[email]'] || p.email || '');
      let firstName = String(p['contact[first_name]'] || p.firstName || '');
      let lastName = String(p['contact[last_name]'] || p.lastName || '');
      let phone = String(p['contact[phone]'] || p.phone || '');
      let listId = String(p.list || p.listId || p['list[id]'] || '');
      let tagId = String(p['contact[tags]'] || p.tagId || p['tag[id]'] || '');
      let tagName = String(p['tag[name]'] || p.tagName || '');
      let initiatedBy = String(p.initiated_by || p.source || '');
      let occurredAt = String(p.date_time || p.dateTime || '');

      let uniqueId = `${ctx.input.eventType}-${contactId || email}-${occurredAt || Date.now()}`;

      return {
        type: `contact.${ctx.input.eventType}`,
        id: uniqueId,
        output: {
          contactId: contactId || undefined,
          email: email || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          listId: listId || undefined,
          tagId: tagId || undefined,
          tagName: tagName || undefined,
          initiatedBy: initiatedBy || undefined,
          occurredAt: occurredAt || undefined
        }
      };
    }
  })
  .build();
