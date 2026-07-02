import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let unisenderEvents = SlateTrigger.create(spec, {
  name: 'Unisender Events',
  key: 'unisender_events',
  description:
    'Receive real-time notifications for email delivery status changes, subscribe/unsubscribe events, campaign status changes, email verification, and user info changes via Unisender webhooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of the event (e.g., email_status, unsubscribe, subscribe, campaign_status)'
        ),
      eventData: z.any().describe('Raw event data from Unisender webhook')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of the event'),
      email: z.string().optional().describe('Email address associated with the event'),
      phone: z.string().optional().describe('Phone number associated with the event'),
      campaignId: z.number().optional().describe('Campaign ID associated with the event'),
      messageId: z.number().optional().describe('Message ID associated with the event'),
      status: z.string().optional().describe('Status value (for status change events)'),
      listId: z.number().optional().describe('List ID associated with the event'),
      rawData: z.any().describe('Full raw event data from the webhook')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new UnisenderClient({
        token: ctx.auth.token,
        locale: ctx.config.locale
      });

      let result = await client.setHook({
        url: ctx.input.webhookBaseUrl,
        event_format: 'json_post',
        single_event: 1,
        status: 'active',
        events: {
          email_status: '*',
          unsubscribe: '*',
          subscribe: '*',
          campaign_status: '*',
          email_check: '*',
          user_info_changed: '*'
        }
      });

      return {
        registrationDetails: {
          hookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new UnisenderClient({
        token: ctx.auth.token,
        locale: ctx.config.locale
      });

      let details = ctx.input.registrationDetails as { hookId: number };
      await client.removeHook(details.hookId);
    },

    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let events: any[] = [];

      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        let body = await ctx.request.json();

        if (Array.isArray(body)) {
          events = body;
        } else if (body && typeof body === 'object') {
          events = [body];
        }
      } else {
        let text = await ctx.request.text();
        try {
          let body = JSON.parse(text);
          if (Array.isArray(body)) {
            events = body;
          } else if (body && typeof body === 'object') {
            events = [body];
          }
        } catch {
          ctx.warn('Could not parse webhook body as JSON');
          return { inputs: [] };
        }
      }

      return {
        inputs: events.map(event => ({
          eventType: event.event_name || event.status || 'unknown',
          eventData: event
        }))
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.eventData;
      let eventType = ctx.input.eventType;

      let email = data.email || undefined;
      let phone = data.phone || undefined;
      let campaignId = data.campaign_id ? Number(data.campaign_id) : undefined;
      let messageId = data.message_id ? Number(data.message_id) : undefined;
      let status = data.status || data.event_name || undefined;
      let listId = data.list_id ? Number(data.list_id) : undefined;

      let eventId = [
        eventType,
        email,
        phone,
        campaignId,
        messageId,
        data.event_time || Date.now()
      ]
        .filter(Boolean)
        .join('-');

      let type: string;
      if (
        eventType.startsWith('ok_') ||
        eventType.startsWith('err_') ||
        eventType === 'not_sent'
      ) {
        type = `email_status.${eventType}`;
      } else if (
        eventType === 'unsubscribe' ||
        eventType === 'subscribe' ||
        eventType === 'subscribe_primary'
      ) {
        type = `contact.${eventType}`;
      } else if (eventType === 'campaign_status') {
        type = `campaign.status_changed`;
      } else if (eventType === 'email_check') {
        type = `sender.verified`;
      } else if (eventType === 'user_info_changed') {
        type = `account.info_changed`;
      } else {
        type = `event.${eventType}`;
      }

      return {
        type,
        id: eventId,
        output: {
          eventType,
          email,
          phone,
          campaignId,
          messageId,
          status,
          listId,
          rawData: data
        }
      };
    }
  })
  .build();
