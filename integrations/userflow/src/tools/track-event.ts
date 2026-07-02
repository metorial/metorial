import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Tracks a custom event for a user and/or group. Events can be used to segment users, personalize flows, and trigger automations. At least one of userId or groupId must be provided.`,
  instructions: [
    'Event names should use snake_case and only contain a-z, A-Z, 0-9, underscores, dashes, spaces, and periods.',
    'At least one of userId or groupId must be provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Name of the event (e.g. "subscription_activated", "feature_used")'),
      userId: z.string().optional().describe('ID of the user the event is associated with'),
      groupId: z.string().optional().describe('ID of the group the event is associated with'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom event attributes (e.g. plan_name, price)')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the tracked event'),
      name: z.string().describe('Name of the event'),
      userId: z.string().nullable().describe('Associated user ID'),
      groupId: z.string().nullable().describe('Associated group ID'),
      attributes: z.record(z.string(), z.unknown()).describe('Event attributes'),
      createdAt: z.string().describe('Timestamp when the event was tracked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let event = await client.trackEvent({
      name: ctx.input.name,
      userId: ctx.input.userId,
      groupId: ctx.input.groupId,
      attributes: ctx.input.attributes
    });

    return {
      output: {
        eventId: event.id,
        name: event.name,
        userId: event.user_id,
        groupId: event.group_id,
        attributes: event.attributes,
        createdAt: event.created_at
      },
      message: `Tracked event **${event.name}**${event.user_id ? ` for user ${event.user_id}` : ''}${event.group_id ? ` in group ${event.group_id}` : ''}.`
    };
  })
  .build();
