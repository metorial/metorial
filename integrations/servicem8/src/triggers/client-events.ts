import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseServiceM8WebhookRequest, WebhookClient } from '../lib/webhooks';
import { spec } from '../spec';

let EVENT_TYPES = ['company.created', 'company.updated'] as const;
let EVENT_WEBHOOK_ID = 'client_event_notifications';
let LEGACY_EVENT_WEBHOOK_ID = 'slates_client_events';

export let clientEvents = SlateTrigger.create(spec, {
  name: 'Client Events',
  key: 'client_events',
  description:
    'Triggers when client (company) events occur in ServiceM8, such as creation or updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of client event'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      companyUuid: z.string().describe('UUID of the affected client/company'),
      eventName: z.string().describe('Name of the event that occurred'),
      name: z.string().optional().describe('Company name'),
      addressStreet: z.string().optional().describe('Street address'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State/province'),
      addressPostcode: z.string().optional().describe('Postal code'),
      addressCountry: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Company website'),
      editDate: z.string().optional().describe('Last modified timestamp')
    })
  )
  .webhook({
    http: {
      methods: ['POST'],
      sync: {
        mode: 'match',
        match: [
          { formBodyField: { path: 'mode', equals: 'subscribe' } },
          { jsonBodyField: { path: 'mode', equals: 'subscribe' } }
        ]
      }
    },
    autoRegisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let registeredEvents: string[] = [];

      for (let event of EVENT_TYPES) {
        try {
          await webhookClient.subscribeEventWebhook({
            event,
            callbackUrl: ctx.input.webhookBaseUrl,
            uniqueId: EVENT_WEBHOOK_ID
          });
          registeredEvents.push(event);
        } catch {
          // Some events may not be available
        }
      }

      return {
        registrationDetails: {
          registeredEvents,
          callbackUrl: ctx.input.webhookBaseUrl,
          uniqueId: EVENT_WEBHOOK_ID
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let webhookClient = new WebhookClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registeredEvents: string[];
        callbackUrl: string;
        uniqueId?: string;
      };

      for (let event of details.registeredEvents) {
        try {
          await webhookClient.unsubscribeEventWebhook({
            event,
            callbackUrl: details.callbackUrl,
            uniqueId: details.uniqueId ?? LEGACY_EVENT_WEBHOOK_ID
          });
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = await parseServiceM8WebhookRequest(ctx.request);
      if (!body) return { inputs: [] };

      if (body?.mode === 'subscribe' && body?.challenge) {
        return {
          inputs: [],
          response: new Response(body.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      let eventName = body?.event || body?.eventName || 'company.updated';
      return {
        inputs: [
          {
            eventType: eventName,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let eventType = ctx.input.eventType;
      let companyUuid =
        payload?.data?.uuid || payload?.entry?.[0]?.uuid || payload?.uuid || '';

      let company: any = {};
      if (companyUuid) {
        try {
          let client = new Client({ token: ctx.auth.token });
          company = await client.getCompany(companyUuid);
        } catch {
          // Company may not be accessible
        }
      }

      return {
        type: eventType,
        id: `${eventType}_${companyUuid}_${payload?.entry?.[0]?.time || Date.now()}`,
        output: {
          companyUuid: company.uuid || companyUuid,
          eventName: eventType,
          name: company.name,
          addressStreet: company.address_street,
          addressCity: company.address_city,
          addressState: company.address_state,
          addressPostcode: company.address_postcode,
          addressCountry: company.address_country,
          website: company.website,
          editDate: company.edit_date
        }
      };
    }
  })
  .build();
