import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List recent events in your Persona organization. Events represent actions like inquiry completions, verification results, report findings, and account changes.
Events are retained for up to 90 days.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterEventType: z
        .string()
        .optional()
        .describe(
          'Filter by event type (e.g., inquiry.completed, account.created, verification.passed)'
        ),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            eventType: z
              .string()
              .optional()
              .describe('Event type (e.g., inquiry.completed, verification.passed)'),
            createdAt: z.string().optional().describe('Event timestamp'),
            resourceType: z.string().optional().describe('Type of affected resource'),
            resourceId: z.string().optional().describe('ID of the affected resource'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Full event attributes')
          })
        )
        .describe('List of events'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listEvents({
      filterEventType: ctx.input.filterEventType,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let events = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      let payload = n.payload || {};
      let payloadData = payload?.data || {};
      return {
        eventId: item.id,
        eventType: n.name || n['event-type'] || n.event_type,
        createdAt: n['created-at'] || n.created_at,
        resourceType: payloadData.type,
        resourceId: payloadData.id,
        attributes: n
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { events, nextCursor },
      message: `Found **${events.length}** events.`
    };
  })
  .build();

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve the full details of a specific event, including the complete payload with all affected resource data.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().describe('Persona event ID (starts with evt_)')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventType: z.string().optional().describe('Event type'),
      createdAt: z.string().optional().describe('Event timestamp'),
      resourceType: z.string().optional().describe('Type of affected resource'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full event attributes including payload'),
      included: z.array(z.any()).optional().describe('Related resources from the event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getEvent(ctx.input.eventId);
    let n = normalizeResource(result.data);
    let payload = n.payload || {};
    let payloadData = payload?.data || {};

    return {
      output: {
        eventId: result.data?.id,
        eventType: n.name || n['event-type'] || n.event_type,
        createdAt: n['created-at'] || n.created_at,
        resourceType: payloadData.type,
        resourceId: payloadData.id,
        attributes: n,
        included: result.included
      },
      message: `Event **${result.data?.id}**: ${n.name || n['event-type'] || 'unknown'}.`
    };
  })
  .build();
