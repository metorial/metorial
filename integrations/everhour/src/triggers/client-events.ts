import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let clientEvents = SlateTrigger.create(spec, {
  name: 'Client Events',
  key: 'client_events',
  description: 'Triggers when a client is created or updated in Everhour.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of client event'),
      eventId: z.string().describe('Unique event identifier'),
      clientData: z.any().describe('Client data from the webhook payload')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('Client ID'),
      name: z.string().optional().describe('Client name'),
      projects: z.array(z.string()).optional().describe('Associated project IDs'),
      businessDetails: z.string().optional().describe('Business details')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:client:created', 'api:client:updated']
      });
      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let hookSecret = ctx.request.headers.get('X-Hook-Secret');
      if (hookSecret) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'X-Hook-Secret': hookSecret }
          })
        };
      }

      let data = (await ctx.request.json()) as any;
      let eventMap: Record<string, string> = {
        'api:client:created': 'created',
        'api:client:updated': 'updated'
      };
      let eventType = eventMap[data.event] || 'updated';
      let clientData = data.payload?.client || data.payload || {};

      return {
        inputs: [
          {
            eventType: eventType as any,
            eventId: `client-${clientData.id || 'unknown'}-${data.event}-${Date.now()}`,
            clientData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let clientData = ctx.input.clientData || {};
      return {
        type: `client.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          clientId: clientData.id || 0,
          name: clientData.name,
          projects: clientData.projects,
          businessDetails: clientData.businessDetails
        }
      };
    }
  });
