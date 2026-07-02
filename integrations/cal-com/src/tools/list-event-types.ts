import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEventTypes = SlateTool.create(spec, {
  name: 'List Event Types',
  key: 'list_event_types',
  description: `Retrieve all event types for the authenticated user. Returns event type details including title, slug, duration, locations, and scheduling configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Filter by username to get event types for a specific user'),
      eventSlug: z
        .string()
        .optional()
        .describe('Filter by specific event slug (requires username)'),
      sortCreatedAt: z.enum(['asc', 'desc']).optional().describe('Sort by creation date')
    })
  )
  .output(
    z.object({
      eventTypes: z.array(z.any()).describe('List of event types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.username) params.username = ctx.input.username;
    if (ctx.input.eventSlug) params.eventSlug = ctx.input.eventSlug;
    if (ctx.input.sortCreatedAt) params.sortCreatedAt = ctx.input.sortCreatedAt;

    let eventTypes = await client.listEventTypes(params);

    let list = Array.isArray(eventTypes) ? eventTypes : [];
    return {
      output: { eventTypes: list },
      message: `Found **${list.length}** event type(s).`
    };
  })
  .build();
