import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataPlaneClient } from '../lib/client';
import { spec } from '../spec';

let contextSchema = z
  .record(z.string(), z.any())
  .optional()
  .describe('Contextual information about the event (e.g., ip, library, locale)');

let integrationsSchema = z
  .record(z.string(), z.any())
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
        .record(z.string(), z.any())
        .optional()
        .describe('User or group traits (used in identify and group events)'),
      properties: z
        .record(z.string(), z.any())
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
      throw new Error(
        'Source Write Key is required to send events. Please configure it in your authentication settings.'
      );
    }
    if (!ctx.config.datePlaneUrl) {
      throw new Error(
        'Data Plane URL is required to send events. Please configure it in your settings.'
      );
    }

    let client = new DataPlaneClient({
      sourceWriteKey: ctx.auth.sourceWriteKey,
      dataPlaneUrl: ctx.config.datePlaneUrl
    });

    let {
      eventType,
      userId,
      anonymousId,
      event,
      traits,
      properties,
      groupId,
      previousId,
      name,
      context,
      timestamp,
      integrations
    } = ctx.input;

    switch (eventType) {
      case 'identify':
        await client.identify({
          userId,
          anonymousId,
          traits,
          context,
          timestamp,
          integrations
        });
        break;
      case 'track':
        if (!event) throw new Error('Event name is required for track events.');
        await client.track({
          userId,
          anonymousId,
          event,
          properties,
          context,
          timestamp,
          integrations
        });
        break;
      case 'page':
        await client.page({
          userId,
          anonymousId,
          name,
          properties,
          context,
          timestamp,
          integrations
        });
        break;
      case 'screen':
        await client.screen({
          userId,
          anonymousId,
          name,
          properties,
          context,
          timestamp,
          integrations
        });
        break;
      case 'group':
        if (!groupId) throw new Error('Group ID is required for group events.');
        await client.group({
          userId,
          anonymousId,
          groupId,
          traits,
          context,
          timestamp,
          integrations
        });
        break;
      case 'alias':
        if (!userId) throw new Error('User ID is required for alias events.');
        if (!previousId) throw new Error('Previous ID is required for alias events.');
        await client.alias({ userId, previousId, context, timestamp, integrations });
        break;
    }

    return {
      output: { success: true },
      message: `Successfully sent **${eventType}** event${userId ? ` for user \`${userId}\`` : ''}${event ? ` (\`${event}\`)` : ''}.`
    };
  })
  .build();
