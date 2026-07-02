import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let logEventsTrigger = SlateTrigger.create(spec, {
  name: 'Log Events',
  key: 'log_events',
  description:
    'Receive Auth0 tenant log events in real-time via webhook log streams. Covers authentication, user actions, management API operations, system notifications, and more.'
})
  .input(
    z.object({
      logId: z.string().describe('Unique log event ID'),
      type: z.string().describe('Event type code'),
      date: z.string().describe('Event timestamp'),
      eventPayload: z.record(z.string(), z.unknown()).describe('Full log event payload')
    })
  )
  .output(
    z.object({
      logId: z.string().describe('Unique log event ID'),
      eventType: z
        .string()
        .describe('Event type code (e.g., "s" for successful login, "f" for failed login)'),
      description: z.string().optional().describe('Human-readable event description'),
      date: z.string().describe('Event timestamp'),
      clientId: z.string().optional().describe('Application client ID involved'),
      clientName: z.string().optional().describe('Application name involved'),
      userId: z.string().optional().describe('User ID involved'),
      userName: z.string().optional().describe('User name or email involved'),
      connection: z.string().optional().describe('Connection used'),
      ip: z.string().optional().describe('IP address of the request'),
      userAgent: z.string().optional().describe('User agent string'),
      hostname: z.string().optional().describe('Hostname of the Auth0 tenant')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Auth0Client({
        token: ctx.auth.token,
        domain: ctx.auth.domain
      });

      let logStream = await client.createLogStream({
        name: `Slates Webhook - ${new Date().toISOString().slice(0, 10)}`,
        type: 'http',
        sink: {
          httpEndpoint: ctx.input.webhookBaseUrl,
          httpContentType: 'application/json',
          httpContentFormat: 'JSONARRAY'
        }
      });

      return {
        registrationDetails: {
          logStreamId: logStream.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Auth0Client({
        token: ctx.auth.token,
        domain: ctx.auth.domain
      });

      let logStreamId = (ctx.input.registrationDetails as any)?.logStreamId;
      if (logStreamId) {
        await client.deleteLogStream(logStreamId);
      }
    },

    handleRequest: async ctx => {
      let body = await ctx.request.json();
      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => ({
        logId: event.log_id || event._id || `${event.type}-${event.date}`,
        type: event.type || 'unknown',
        date: event.date || new Date().toISOString(),
        eventPayload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let event = ctx.input.eventPayload as any;

      return {
        type: `log.${(ctx.input.type || 'unknown').toLowerCase()}`,
        id: ctx.input.logId,
        output: {
          logId: ctx.input.logId,
          eventType: ctx.input.type,
          description: event.description,
          date: ctx.input.date,
          clientId: event.client_id,
          clientName: event.client_name,
          userId: event.user_id,
          userName: event.user_name,
          connection: event.connection,
          ip: event.ip,
          userAgent: event.user_agent,
          hostname: event.hostname
        }
      };
    }
  })
  .build();
