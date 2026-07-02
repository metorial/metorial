import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let serviceEvents = SlateTrigger.create(spec, {
  name: 'Service Events',
  key: 'service_events',
  description:
    'Triggers when PagerDuty services are created, updated, or deleted. Provides details about the affected service.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of service event'),
      eventId: z.string().describe('Unique event ID'),
      serviceId: z.string().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      serviceDescription: z.string().optional().describe('Service description'),
      serviceStatus: z.string().optional().describe('Service status'),
      htmlUrl: z.string().optional().describe('Service web URL'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      serviceDescription: z.string().optional().describe('Service description'),
      serviceStatus: z.string().optional().describe('Service status'),
      htmlUrl: z.string().optional().describe('Web URL to the service'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PagerDutyClient({
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType,
        region: ctx.config.region
      });

      let subscription = await client.createWebhookSubscription({
        deliveryUrl: ctx.input.webhookBaseUrl,
        events: ['service.created', 'service.updated', 'service.deleted'],
        filterType: 'account_reference',
        description: 'Slates service events webhook'
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PagerDutyClient({
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType,
        region: ctx.config.region
      });

      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteWebhookSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        event?: {
          id?: string;
          event_type?: string;
          occurred_at?: string;
          data?: {
            id?: string;
            name?: string;
            description?: string;
            status?: string;
            html_url?: string;
          };
        };
      };

      if (!body.event?.event_type || !body.event?.data?.id) {
        return { inputs: [] };
      }

      let evt = body.event;
      let data = evt.data!;

      return {
        inputs: [
          {
            eventType: evt.event_type!,
            eventId: evt.id || `${data.id}-${evt.event_type}-${evt.occurred_at}`,
            serviceId: data.id!,
            serviceName: data.name,
            serviceDescription: data.description,
            serviceStatus: data.status,
            htmlUrl: data.html_url,
            occurredAt: evt.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          serviceId: ctx.input.serviceId,
          serviceName: ctx.input.serviceName,
          serviceDescription: ctx.input.serviceDescription,
          serviceStatus: ctx.input.serviceStatus,
          htmlUrl: ctx.input.htmlUrl,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
