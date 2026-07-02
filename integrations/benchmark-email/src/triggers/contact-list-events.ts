import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactListEvents = SlateTrigger.create(spec, {
  name: 'Contact List Events',
  key: 'contact_list_events',
  description:
    'Triggers when contacts are subscribed, unsubscribed, updated, cleaned, or have their email changed on a contact list.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'subscribe',
          'unsubscribe',
          'profile_update',
          'cleaned_address',
          'email_changed'
        ])
        .describe('Type of contact list event'),
      listId: z.string().describe('ID of the contact list the event occurred on'),
      contactEmail: z.string().describe('Email address of the affected contact'),
      contactData: z
        .record(z.string(), z.any())
        .describe('Full contact data from the webhook payload')
    })
  )
  .output(
    z.object({
      contactEmail: z.string().describe('Email address of the affected contact'),
      listId: z.string().describe('ID of the contact list'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      rawFields: z.record(z.string(), z.any()).describe('All fields from the webhook payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Get all contact lists and register webhooks for each
      let listsResult = await client.listContactLists({ pageSize: 100 });
      let lists = listsResult?.Data ?? [];
      let registrations: Array<{ listId: string; webhookId: string }> = [];

      for (let list of lists) {
        let listId = String(list.ID);
        try {
          let result = await client.createWebhook(listId, {
            clientUrl: ctx.input.webhookBaseUrl,
            subscribes: true,
            unsubscribes: true,
            profileUpdates: true,
            cleanedAddress: true,
            emailChanged: true
          });
          if (result?.Status === 1) {
            registrations.push({
              listId,
              webhookId: String(result?.Data ?? '')
            });
          }
        } catch {
          // Skip lists that fail webhook registration
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations ?? [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.listId, reg.webhookId);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      // Benchmark Email sends webhook data as key/value pairs via POST
      let data: Record<string, any>;

      try {
        let contentType = ctx.request.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          data = (await ctx.request.json()) as Record<string, any>;
        } else {
          // Parse URL-encoded form data
          let text = await ctx.request.text();
          data = Object.fromEntries(new URLSearchParams(text));
        }
      } catch {
        data = {};
      }

      if (!data || Object.keys(data).length === 0) {
        return { inputs: [] };
      }

      // Determine event type from the payload
      // Benchmark Email doesn't consistently include an event type field,
      // so we infer from context
      let eventType:
        | 'subscribe'
        | 'unsubscribe'
        | 'profile_update'
        | 'cleaned_address'
        | 'email_changed' = 'subscribe';

      if (data.event_type) {
        let et = String(data.event_type).toLowerCase();
        if (et.includes('unsubscribe')) eventType = 'unsubscribe';
        else if (et.includes('profile') || et.includes('update')) eventType = 'profile_update';
        else if (et.includes('clean')) eventType = 'cleaned_address';
        else if (et.includes('email') && et.includes('change')) eventType = 'email_changed';
        else if (et.includes('subscribe')) eventType = 'subscribe';
      } else if (data.EventType) {
        let et = String(data.EventType).toLowerCase();
        if (et.includes('unsubscribe')) eventType = 'unsubscribe';
        else if (et.includes('profile') || et.includes('update')) eventType = 'profile_update';
        else if (et.includes('clean')) eventType = 'cleaned_address';
        else if (et.includes('email') && et.includes('change')) eventType = 'email_changed';
        else if (et.includes('subscribe')) eventType = 'subscribe';
      }

      let email = String(data.Email ?? data.email ?? '');
      let listId = String(data.ContactMasterID ?? data.ListID ?? data.listId ?? '');

      return {
        inputs: [
          {
            eventType,
            listId,
            contactEmail: email,
            contactData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, listId, contactEmail, contactData } = ctx.input;

      let eventId = `${listId}-${contactEmail}-${eventType}-${Date.now()}`;

      return {
        type: `contact.${eventType}`,
        id: eventId,
        output: {
          contactEmail,
          listId,
          firstName: String(contactData.FirstName ?? contactData.firstName ?? ''),
          lastName: String(contactData.LastName ?? contactData.lastName ?? ''),
          rawFields: contactData
        }
      };
    }
  })
  .build();
