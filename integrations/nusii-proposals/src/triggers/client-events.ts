import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CLIENT_EVENTS = ['client_created', 'client_updated', 'client_destroyed'] as const;

export let clientEvents = SlateTrigger.create(spec, {
  name: 'Client Events',
  key: 'client_events',
  description: 'Triggers when a client is created, updated, or deleted.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      clientId: z.string().describe('The client ID from the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      clientId: z.string(),
      email: z.string(),
      name: z.string(),
      surname: z.string(),
      fullName: z.string(),
      currency: z.string(),
      business: z.string(),
      locale: z.string(),
      pdfPageSize: z.string(),
      web: z.string(),
      telephone: z.string(),
      address: z.string(),
      city: z.string(),
      postcode: z.string(),
      country: z.string(),
      state: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhookEndpoint(ctx.input.webhookBaseUrl, [
        ...CLIENT_EVENTS
      ]);

      return {
        registrationDetails: {
          webhookEndpointId: webhook.webhookEndpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';
      let clientData = body.data || body.client || body;

      let clientId = String(clientData?.id || clientData?.data?.id || '');

      return {
        inputs: [
          {
            eventName,
            clientId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.eventName;
      let payload = ctx.input.rawPayload;

      let data = payload?.data || payload?.client || payload;
      let attrs = data?.attributes || data || {};

      let typeMap: Record<string, string> = {
        client_created: 'client.created',
        client_updated: 'client.updated',
        client_destroyed: 'client.destroyed'
      };

      let type = typeMap[eventName] || `client.${eventName}`;

      return {
        type,
        id: `${eventName}_${ctx.input.clientId}_${Date.now()}`,
        output: {
          clientId: ctx.input.clientId || String(data?.id || ''),
          email: attrs.email || '',
          name: attrs.name || '',
          surname: attrs.surname || '',
          fullName: attrs.full_name || '',
          currency: attrs.currency || '',
          business: attrs.business || '',
          locale: attrs.locale || '',
          pdfPageSize: attrs.pdf_page_size || '',
          web: attrs.web || '',
          telephone: attrs.telephone || '',
          address: attrs.address || '',
          city: attrs.city || '',
          postcode: attrs.postcode || '',
          country: attrs.country || '',
          state: attrs.state || ''
        }
      };
    }
  })
  .build();
