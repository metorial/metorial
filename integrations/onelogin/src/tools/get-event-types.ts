import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let getEventTypes = SlateTool.create(spec, {
  name: 'Get Event Types',
  key: 'get_event_types',
  description: `Retrieve all available event types from OneLogin. Each event type has an ID, name, and description. Use these IDs to filter events when querying the events API. Results should be cached as this endpoint is rate-limited.`,
  constraints: ['This endpoint is rate-limited. Cache results for up to 24 hours.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      eventTypes: z
        .array(
          z.object({
            eventTypeId: z.number().describe('Event type ID'),
            name: z.string().describe('Event type name (e.g., USER_LOGGED_INTO_ONELOGIN)'),
            description: z
              .string()
              .nullable()
              .optional()
              .describe('Human-readable description')
          })
        )
        .describe('List of all event types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let response = await client.getEventTypes();
    let types = response.data || [];

    let mapped = types.map((t: any) => ({
      eventTypeId: t.id,
      name: t.name,
      description: t.description
    }));

    return {
      output: { eventTypes: mapped },
      message: `Found **${mapped.length}** event type(s).`
    };
  });
