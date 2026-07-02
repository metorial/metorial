import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { spec } from '../spec';

export let channelEvents = SlateTrigger.create(spec, {
  name: 'Channel Events',
  key: 'channel_events',
  description:
    'Receive webhook notifications for Ably channel events including messages, presence changes, lifecycle events, and occupancy changes. Configure via the Ably dashboard Integrations tab or use the Manage Integration Rules tool to set up an HTTP rule pointing to the webhook URL.'
})
  .input(
    z.object({
      eventSource: z
        .string()
        .describe(
          'Event source type (channel.message, channel.presence, channel.lifecycle, channel.occupancy)'
        ),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      channelId: z.string().optional().describe('Channel the event occurred on'),
      name: z.string().optional().describe('Event or message name'),
      timestamp: z.number().optional().describe('Event timestamp'),
      messageData: z.any().optional().describe('Event payload data'),
      clientId: z.string().optional().describe('Client ID associated with the event'),
      connectionId: z.string().optional().describe('Connection ID associated with the event'),
      action: z
        .string()
        .optional()
        .describe(
          'Presence action (enter, leave, update) or lifecycle action (attached, detached)'
        ),
      occupancy: z.any().optional().describe('Occupancy metrics for occupancy events'),
      raw: z.any().optional().describe('Raw event payload from Ably')
    })
  )
  .output(
    z.object({
      channelId: z.string().optional().describe('Channel the event occurred on'),
      name: z.string().optional().describe('Event or message name'),
      timestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      messageData: z.any().optional().describe('Event payload data'),
      clientId: z.string().optional().describe('Client ID associated with the event'),
      connectionId: z.string().optional().describe('Connection ID associated with the event'),
      action: z.string().optional().describe('Presence or lifecycle action'),
      occupancy: z.any().optional().describe('Occupancy metrics (for occupancy events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      // Auto-register only works with Control API token auth
      if (ctx.auth.authType !== 'control_token') {
        throw new Error(
          'Auto-registering webhooks requires Control API Token authentication. Alternatively, configure the webhook manually in the Ably dashboard.'
        );
      }

      let appId = ctx.config.appId;
      if (!appId) {
        throw new Error('appId is required in config for auto-registering webhooks.');
      }

      let client = new AblyControlClient(ctx.auth.token);

      let rule = await client.createRule(appId, {
        ruleType: 'http',
        requestMode: 'single',
        source: {
          channelFilter: '.*',
          type: 'channel.message'
        },
        target: {
          url: ctx.input.webhookBaseUrl,
          format: 'json',
          enveloped: true
        },
        status: 'enabled'
      });

      return {
        registrationDetails: {
          ruleId: rule.id,
          appId: appId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      if (ctx.auth.authType !== 'control_token') return;

      let details = ctx.input.registrationDetails as { ruleId: string; appId: string };
      if (!details?.ruleId || !details?.appId) return;

      let client = new AblyControlClient(ctx.auth.token);
      await client.deleteRule(details.appId, details.ruleId);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Ably can send single or batch payloads
      let events: any[] = Array.isArray(body) ? body : [body];
      let inputs: Array<{
        eventSource: string;
        eventId: string;
        channelId?: string;
        name?: string;
        timestamp?: number;
        messageData?: any;
        clientId?: string;
        connectionId?: string;
        action?: string;
        occupancy?: any;
        raw?: any;
      }> = [];

      for (let event of events) {
        // Enveloped format has source, channel, etc. at top level
        let source = event.source || 'channel.message';
        let channelId = event.channel || event.name;
        let timestamp = event.timestamp;

        if (source === 'channel.message' || source === 'channel.presence') {
          // Messages array inside the event
          let messages = event.messages || event.presence || [];
          if (!Array.isArray(messages)) messages = [messages];

          for (let msg of messages) {
            let eventId =
              msg.id || `${channelId}-${msg.timestamp || timestamp}-${msg.name || ''}`;
            inputs.push({
              eventSource: source,
              eventId,
              channelId,
              name: msg.name,
              timestamp: msg.timestamp || timestamp,
              messageData: msg.data,
              clientId: msg.clientId,
              connectionId: msg.connectionId,
              action: msg.action,
              raw: msg
            });
          }
        } else if (source === 'channel.lifecycle') {
          let eventId = event.id || `${channelId}-lifecycle-${timestamp}`;
          inputs.push({
            eventSource: source,
            eventId,
            channelId,
            name: event.name,
            timestamp,
            action: event.action,
            raw: event
          });
        } else if (source === 'channel.occupancy') {
          let eventId = event.id || `${channelId}-occupancy-${timestamp}`;
          inputs.push({
            eventSource: source,
            eventId,
            channelId,
            name: event.name,
            timestamp,
            occupancy: event.data?.metrics || event.data,
            raw: event
          });
        } else {
          // Unknown source - still pass through
          let eventId = event.id || `${channelId}-${source}-${timestamp}`;
          inputs.push({
            eventSource: source,
            eventId,
            channelId,
            timestamp,
            messageData: event.data,
            raw: event
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventSource.replace('.', '_'),
        id: ctx.input.eventId,
        output: {
          channelId: ctx.input.channelId,
          name: ctx.input.name,
          timestamp: ctx.input.timestamp,
          messageData: ctx.input.messageData,
          clientId: ctx.input.clientId,
          connectionId: ctx.input.connectionId,
          action: ctx.input.action,
          occupancy: ctx.input.occupancy
        }
      };
    }
  })
  .build();
