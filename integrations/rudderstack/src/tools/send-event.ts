import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DataPlaneClient } from '../lib/client';
import { spec } from '../spec';

let contextSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Contextual information about the event (e.g., ip, library, locale)');

let integrationsSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Destination-specific flags to enable/disable forwarding');

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a customer event to RudderStack via the HTTP API. Supports all standard event types: **identify**, **track**, **page**, **screen**, **group**, and **alias**.
Requires a Data Plane URL and Source Write Key to be configured. Use this tool for server-side event tracking, importing historical data, or programmatically sending events.`,
  instructions: [
    'Either userId or anonymousId must be provided for identify, track, page, screen, and group events.',
    'For alias events, both userId (new) and previousId (old) are required.',
    'Timestamps must be in ISO 8601 format (yyyy-MM-ddTHH:mm:ss.SSSZ) for historical imports.'
  ],
  constraints: ['Maximum event size is 32KB per call.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe('Unique event identifier for deduplication and downstream correlation.'),
      eventType: z
        .enum(['identify', 'track', 'page', 'screen', 'group', 'alias'])
        .describe('Type of event to send'),
      userId: z.string().optional().describe('Unique user identifier'),
      anonymousId: z.string().optional().describe('Anonymous user identifier'),
      event: z
        .string()
        .optional()
        .describe('Name of the tracked event (required for track events)'),
      traits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('User or group traits (used in identify and group events)'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Event or page/screen properties (used in track, page, screen events)'),
      groupId: z.string().optional().describe('Group identifier (required for group events)'),
      previousId: z
        .string()
        .optional()
        .describe('Previous user ID (required for alias events)'),
      name: z
        .string()
        .optional()
        .describe('Page or screen name (used in page and screen events)'),
      context: contextSchema,
      timestamp: z.string().optional().describe('ISO 8601 timestamp for historical imports'),
      integrations: integrationsSchema
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was accepted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.sourceWriteKey) {
      throw createApiServiceError(
        'Source Write Key is required to send events. Please configure it in your authentication settings.'
      );
    }
    if (!(ctx.config.dataPlaneUrl ?? ctx.config.datePlaneUrl)) {
      throw createApiServiceError(
        'Data Plane URL is required to send events. Please configure it in your settings.'
      );
    }

    let client = new DataPlaneClient({
      sourceWriteKey: ctx.auth.sourceWriteKey,
      dataPlaneUrl: (ctx.config.dataPlaneUrl ?? ctx.config.datePlaneUrl)!
    });

    let { eventType, ...data } = ctx.input;
    // Keep the established field names; omit event-type fields that do not apply.
    let common = {
      userId: data.userId,
      anonymousId: data.anonymousId,
      context: data.context,
      timestamp: data.timestamp,
      integrations: data.integrations,
      messageId: data.messageId
    };
    if (eventType === 'identify') await client.identify({ ...common, traits: data.traits });
    if (eventType === 'track')
      await client.track({ ...common, event: data.event, properties: data.properties });
    if (eventType === 'page')
      await client.page({ ...common, name: data.name, properties: data.properties });
    if (eventType === 'screen')
      await client.screen({ ...common, name: data.name, properties: data.properties });
    if (eventType === 'group')
      await client.group({ ...common, groupId: data.groupId, traits: data.traits });
    if (eventType === 'alias') await client.alias({ ...common, previousId: data.previousId });

    return {
      output: { success: true },
      message: `RudderStack accepted the ${eventType} event for ingestion. This does not confirm downstream delivery.`
    };
  })
  .build();
