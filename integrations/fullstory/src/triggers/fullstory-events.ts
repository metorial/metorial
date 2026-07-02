import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fullstoryEvents = SlateTrigger.create(spec, {
  name: 'FullStory Events',
  key: 'fullstory_events',
  description:
    'Triggers when FullStory system events occur, including notes created on sessions, segments created, segment threshold alerts, custom recording events, and metric alerts.'
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe(
          'The webhook event type (e.g., note.created, segment.created, segment.trend.alert, recording.event.custom, metric.alert)'
        ),
      webhookVersion: z.number().optional().describe('Webhook payload version'),
      eventData: z.record(z.string(), z.any()).describe('Event-specific data payload')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('The event type that triggered this webhook'),
      noteText: z.string().optional().describe('Note text (for note.created events)'),
      noteAuthorEmail: z
        .string()
        .optional()
        .describe('Email of the note author (for note.created events)'),
      sessionReplayUrl: z
        .string()
        .optional()
        .describe('Session replay URL (for note and custom event types)'),
      segmentName: z.string().optional().describe('Segment name (for segment events)'),
      segmentId: z.string().optional().describe('Segment ID (for segment events)'),
      segmentUrl: z.string().optional().describe('Segment URL (for segment events)'),
      alertThreshold: z
        .number()
        .optional()
        .describe('Alert threshold value (for segment.trend.alert events)'),
      alertDirection: z
        .string()
        .optional()
        .describe('Alert direction - above or below (for segment.trend.alert events)'),
      alertActiveUsers: z
        .number()
        .optional()
        .describe('Number of active users that triggered the alert'),
      customEventName: z
        .string()
        .optional()
        .describe('Custom event name (for recording.event.custom events)'),
      customEventProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom event properties (for recording.event.custom events)'),
      metricName: z.string().optional().describe('Metric name (for metric.alert events)'),
      metricValue: z.number().optional().describe('Metric value that triggered the alert'),
      userId: z.string().optional().describe('FullStory user ID associated with the event'),
      rawData: z.record(z.string(), z.any()).describe('Complete raw event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let allEventTypes = [
        { eventName: 'note.created' },
        { eventName: 'segment.created' },
        { eventName: 'segment.trend.alert' },
        { eventName: 'metric.alert' }
      ];

      let endpoint = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        eventTypes: allEventTypes
      });

      return {
        registrationDetails: {
          endpointId: endpoint.endpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { endpointId: string };
      await client.deleteWebhookEndpoint(details.endpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventName = body.eventName || body.event_name || '';
      let version = body.version;
      let data = body.data || {};

      return {
        inputs: [
          {
            eventName,
            webhookVersion: version,
            eventData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.eventData;
      let eventName = ctx.input.eventName;

      let output: Record<string, any> = {
        eventName,
        rawData: data
      };

      // Extract common fields
      if (data.userId || data.user_id) {
        output.userId = data.userId || data.user_id;
      }
      if (data.sessionUrl || data.session_url || data.fsUrl || data.fs_url) {
        output.sessionReplayUrl =
          data.sessionUrl || data.session_url || data.fsUrl || data.fs_url;
      }

      // Note events
      if (eventName === 'note.created') {
        output.noteText = data.text || data.noteText || data.note_text;
        output.noteAuthorEmail = data.authorEmail || data.author_email || data.email;
        output.sessionReplayUrl =
          data.sessionUrl || data.session_url || data.fsUrl || data.fs_url;
      }

      // Segment events
      if (eventName === 'segment.created' || eventName === 'segment.trend.alert') {
        output.segmentName = data.segmentName || data.segment_name || data.name;
        output.segmentId = data.segmentId || data.segment_id || data.id;
        output.segmentUrl = data.segmentUrl || data.segment_url || data.url;
      }

      // Segment threshold alert
      if (eventName === 'segment.trend.alert') {
        output.alertThreshold = data.threshold;
        output.alertDirection = data.direction;
        output.alertActiveUsers = data.activeUsers || data.active_users;
      }

      // Custom recording events
      if (eventName === 'recording.event.custom') {
        output.customEventName = data.eventName || data.event_name || data.name;
        output.customEventProperties =
          data.properties || data.eventProperties || data.event_properties;
        output.sessionReplayUrl =
          data.sessionUrl || data.session_url || data.fsUrl || data.fs_url;
      }

      // Metric alerts
      if (eventName === 'metric.alert') {
        output.metricName = data.metricName || data.metric_name || data.name;
        output.metricValue = data.metricValue || data.metric_value || data.value;
      }

      // Generate a unique ID for deduplication
      let eventId = data.id || data.eventId || data.event_id || `${eventName}-${Date.now()}`;

      return {
        type: eventName || 'fullstory.event',
        id: String(eventId),
        output: output as any
      };
    }
  })
  .build();
