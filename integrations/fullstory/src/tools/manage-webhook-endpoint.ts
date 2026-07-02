import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypeSchema = z.object({
  eventName: z
    .string()
    .describe(
      'Event type name (e.g., "note.created", "segment.created", "recording.event.custom", "metric.alert")'
    ),
  subcategory: z
    .string()
    .optional()
    .describe('Subcategory, required for "recording.event.custom" events')
});

export let manageWebhookEndpoint = SlateTool.create(spec, {
  name: 'Manage Webhook Endpoint',
  key: 'manage_webhook_endpoint',
  description: `Create, update, or delete a webhook endpoint in FullStory. Webhook endpoints receive notifications for system events such as notes, segments, custom events, and metric alerts.

**To create**: provide url and eventTypes.
**To update**: provide endpointId along with any fields to change.
**To delete**: provide endpointId and set deleteEndpoint to true.`,
  instructions: [
    'Available event types: note.created, segment.created, segment.trend.alert, recording.event.custom (requires subcategory), metric.alert.',
    'The signing secret is used for HMAC-SHA256 signature verification of webhook payloads.'
  ],
  constraints: ['Requires an Admin or Architect API key.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      endpointId: z
        .string()
        .optional()
        .describe('ID of an existing endpoint to update or delete'),
      deleteEndpoint: z
        .boolean()
        .optional()
        .describe('Set to true to delete the endpoint (requires endpointId)'),
      url: z.string().optional().describe('Destination URL for webhook payloads'),
      eventTypes: z.array(eventTypeSchema).optional().describe('Event types to subscribe to'),
      secret: z
        .string()
        .optional()
        .describe('Shared secret for HMAC-SHA256 payload signature verification'),
      enabled: z.boolean().optional().describe('Whether the endpoint is enabled (for updates)')
    })
  )
  .output(
    z.object({
      endpointId: z.string().optional().describe('Webhook endpoint ID'),
      url: z.string().optional().describe('Endpoint URL'),
      enabled: z.boolean().optional().describe('Whether the endpoint is enabled'),
      eventTypes: z.array(eventTypeSchema).optional().describe('Subscribed event types'),
      created: z.string().optional().describe('When the endpoint was created'),
      modified: z.string().optional().describe('When the endpoint was last modified'),
      deleted: z.boolean().optional().describe('Whether the endpoint was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.deleteEndpoint && ctx.input.endpointId) {
      await client.deleteWebhookEndpoint(ctx.input.endpointId);
      return {
        output: {
          endpointId: ctx.input.endpointId,
          deleted: true
        },
        message: `Webhook endpoint \`${ctx.input.endpointId}\` deleted.`
      };
    }

    if (ctx.input.endpointId) {
      let endpoint = await client.updateWebhookEndpoint(ctx.input.endpointId, {
        url: ctx.input.url,
        eventTypes: ctx.input.eventTypes,
        secret: ctx.input.secret,
        enabled: ctx.input.enabled
      });

      return {
        output: {
          endpointId: endpoint.endpointId,
          url: endpoint.url,
          enabled: endpoint.enabled,
          eventTypes: endpoint.eventTypes,
          created: endpoint.created,
          modified: endpoint.modified
        },
        message: `Webhook endpoint \`${endpoint.endpointId}\` updated.`
      };
    }

    if (!ctx.input.url || !ctx.input.eventTypes) {
      throw new Error('url and eventTypes are required when creating a new webhook endpoint');
    }

    let endpoint = await client.createWebhookEndpoint({
      url: ctx.input.url,
      eventTypes: ctx.input.eventTypes,
      secret: ctx.input.secret
    });

    return {
      output: {
        endpointId: endpoint.endpointId,
        url: endpoint.url,
        enabled: endpoint.enabled,
        eventTypes: endpoint.eventTypes,
        created: endpoint.created,
        modified: endpoint.modified
      },
      message: `Webhook endpoint \`${endpoint.endpointId}\` created for ${endpoint.url}.`
    };
  })
  .build();
