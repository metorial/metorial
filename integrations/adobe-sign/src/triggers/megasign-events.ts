import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let megaSignEvents = SlateTrigger.create(spec, {
  name: 'Send in Bulk Events',
  key: 'megasign_events',
  description:
    'Receive real-time notifications for Send in Bulk (MegaSign) operations including creation, recall, sharing, and reminder events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The webhook event type (e.g., MEGASIGN_CREATED, MEGASIGN_RECALLED)'),
      eventId: z.string().describe('Unique identifier for this webhook notification'),
      megaSignId: z.string().describe('ID of the affected bulk send operation'),
      megaSignName: z.string().optional().describe('Name of the affected bulk send operation'),
      eventDate: z.string().optional().describe('Timestamp of the event'),
      actingUserEmail: z
        .string()
        .optional()
        .describe('Email of the user who performed the action'),
      status: z.string().optional().describe('MegaSign status after the event')
    })
  )
  .output(
    z.object({
      megaSignId: z.string().describe('ID of the affected bulk send operation'),
      megaSignName: z.string().optional().describe('Name of the bulk send operation'),
      status: z.string().optional().describe('Current status of the bulk send operation'),
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
        name: 'Slates MegaSign Events',
        scope: 'ACCOUNT',
        webhookSubscriptionEvents: ['MEGASIGN_ALL'],
        webhookUrlInfo: { url: ctx.input.webhookBaseUrl },
        webhookConditionalParams: {
          webhookMegaSignEvents: {
            includeDetailedInfo: true
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

      if (!data.event?.startsWith('MEGASIGN_')) {
        return {
          inputs: [],
          response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let megaSign = data.megaSign || {};

      return {
        inputs: [
          {
            eventType: data.event,
            eventId:
              data.webhookNotificationId ||
              `${data.event}_${megaSign.id || ''}_${data.eventDate || Date.now()}`,
            megaSignId: megaSign.id || data.eventResourceId || '',
            megaSignName: megaSign.name,
            eventDate: data.eventDate,
            actingUserEmail: data.actingUserEmail,
            status: megaSign.status
          }
        ],
        response: new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      };
    },

    handleEvent: async ctx => {
      let eventSuffix = ctx.input.eventType.replace('MEGASIGN_', '').toLowerCase();

      return {
        type: `megasign.${eventSuffix}`,
        id: ctx.input.eventId,
        output: {
          megaSignId: ctx.input.megaSignId,
          megaSignName: ctx.input.megaSignName,
          status: ctx.input.status,
          eventDate: ctx.input.eventDate,
          actingUserEmail: ctx.input.actingUserEmail
        }
      };
    }
  });
