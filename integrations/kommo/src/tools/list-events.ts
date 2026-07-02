import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let eventOutputSchema = z.object({
  eventId: z.string().describe('Event ID'),
  eventType: z.string().describe('Event type (e.g., lead_added, contact_deleted)'),
  entityId: z.number().optional().describe('Affected entity ID'),
  entityType: z.string().optional().describe('Affected entity type'),
  createdBy: z.number().optional().describe('User who triggered the event'),
  createdAt: z.number().optional().describe('Event timestamp (Unix)'),
  valueBefore: z.any().optional().describe('State before the event'),
  valueAfter: z.any().optional().describe('State after the event')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events (audit log) from the Kommo account. Filter by entity type, entity ID, event types, or time range. Tracks all changes across leads, contacts, companies, and more.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      entityType: z
        .enum(['lead', 'contact', 'company'])
        .optional()
        .describe('Filter by entity type'),
      entityId: z.number().optional().describe('Filter by specific entity ID'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by event types (e.g., lead_added, contact_deleted)'),
      createdAtFrom: z.number().optional().describe('Start of time range (Unix timestamp)'),
      createdAtTo: z.number().optional().describe('End of time range (Unix timestamp)'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      events: z.array(eventOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let events = await client.listEvents(
      {
        entityType: ctx.input.entityType,
        entityId: ctx.input.entityId,
        types: ctx.input.eventTypes,
        createdAtFrom: ctx.input.createdAtFrom,
        createdAtTo: ctx.input.createdAtTo
      },
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = events.map((e: any) => ({
      eventId: e.id,
      eventType: e.type,
      entityId: e.entity_id,
      entityType: e.entity_type,
      createdBy: e.created_by,
      createdAt: e.created_at,
      valueBefore: e.value_before,
      valueAfter: e.value_after
    }));

    return {
      output: { events: mapped },
      message: `Found **${mapped.length}** event(s).`
    };
  })
  .build();
