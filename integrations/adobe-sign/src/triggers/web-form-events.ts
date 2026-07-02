import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webFormEvents = SlateTrigger.create(spec, {
  name: 'Web Form Events',
  key: 'web_form_events',
  description:
    'Receive real-time notifications for web form (widget) lifecycle events including creation, enablement, disablement, modification, and sharing.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The webhook event type (e.g., WIDGET_CREATED, WIDGET_ENABLED)'),
      eventId: z.string().describe('Unique identifier for this webhook notification'),
      widgetId: z.string().describe('ID of the affected web form'),
      widgetName: z.string().optional().describe('Name of the affected web form'),
      eventDate: z.string().optional().describe('Timestamp of the event'),
      actingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who performed the action'),
      status: z.string().optional().describe('Web form status after the event')
    })
  )
  .output(
    z.object({
      webFormId: z.string().describe('ID of the affected web form'),
      webFormName: z.string().optional().describe('Name of the web form'),
      status: z.string().optional().describe('Current status of the web form'),
      eventDate: z.string().optional().describe('When the event occurred'),
      actingUserEmail: z.string().optional().describe('Email of the acting user')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl,
        shard: ctx.auth.shard
      });

      let result = await client.createWebhook({
        name: 'Slates Web Form Events',
        scope: 'ACCOUNT',
        webhookSubscriptionEvents: ['WIDGET_ALL'],
        webhookUrlInfo: { url: ctx.input.webhookBaseUrl },
        webhookConditionalParams: {
          webhookWidgetEvents: {
            includeDetailedInfo: true,
            includeDocumentsInfo: false,
            includeParticipantsInfo: false
          }
        }
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl,
        shard: ctx.auth.shard
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      if (ctx.request.method === 'GET') {
        let clientId = ctx.request.headers.get('X-AdobeSign-ClientId') || '';
        return {
          inputs: [],
          response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let data = (await ctx.request.json()) as any;
      let clientId = ctx.request.headers.get('X-AdobeSign-ClientId') || '';

      if (!data.event?.startsWith('WIDGET_')) {
        return {
          inputs: [],
          response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let widget = data.widget || {};

      return {
        inputs: [
          {
            eventType: data.event,
            eventId:
              data.webhookNotificationId ||
              `${data.event}_${widget.id || ''}_${data.eventDate || Date.now()}`,
            widgetId: widget.id || data.eventResourceId || '',
            widgetName: widget.name,
            eventDate: data.eventDate,
            actingUserEmail: data.actingUserEmail,
            status: widget.status
          }
        ],
        response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      };
    },

    handleEvent: async ctx => {
      let eventSuffix = ctx.input.eventType.replace('WIDGET_', '').toLowerCase();

      return {
        type: `web_form.${eventSuffix}`,
        id: ctx.input.eventId,
        output: {
          webFormId: ctx.input.widgetId,
          webFormName: ctx.input.widgetName,
          status: ctx.input.status,
          eventDate: ctx.input.eventDate,
          actingUserEmail: ctx.input.actingUserEmail
        }
      };
    }
  });
