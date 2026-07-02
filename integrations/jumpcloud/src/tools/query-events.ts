import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryEvents = SlateTool.create(spec, {
  name: 'Query Directory Events',
  key: 'query_events',
  description: `Query JumpCloud Directory Insights event logs for audit trails, compliance, and monitoring. Search across categories like SSO authentications, RADIUS events, system logins, LDAP operations, MDM events, and directory changes. Supports time range filtering and cursor-based pagination.`,
  instructions: [
    'Service types include: "all", "directory", "sso", "radius", "systems", "ldap", "mdm", "password_manager", "software".',
    'Timestamps must be in RFC3339 UTC format, e.g. "2024-01-01T00:00:00Z".',
    'For pagination, use the searchAfter cursor from the previous response.'
  ],
  constraints: ['Events are retained for 90 days.', 'Maximum 10,000 events per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      service: z
        .array(z.string())
        .describe('Event services to query, e.g. ["directory", "sso", "radius"]'),
      startTime: z
        .string()
        .describe('Start time in RFC3339 UTC format, e.g. "2024-01-01T00:00:00Z"'),
      endTime: z.string().optional().describe('End time in RFC3339 UTC format'),
      limit: z
        .number()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum events to return (default 100, max 10000)'),
      searchAfter: z.any().optional().describe('Cursor from previous response for pagination'),
      searchQuery: z.string().optional().describe('Free-text search query')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().optional().describe('Event ID'),
            timestamp: z.string().optional().describe('Event timestamp'),
            eventType: z.string().optional().describe('Event type'),
            service: z.string().optional().describe('Service category'),
            initiatedById: z.string().optional().describe('ID of the initiating actor'),
            initiatedByType: z.string().optional().describe('Type of the initiating actor'),
            initiatedByEmail: z.string().optional().describe('Email of the initiating actor'),
            resourceId: z.string().optional().describe('Affected resource ID'),
            resourceType: z.string().optional().describe('Affected resource type'),
            organization: z.string().optional().describe('Organization ID'),
            rawEvent: z.any().optional().describe('Full raw event data')
          })
        )
        .describe('Matching events'),
      searchAfter: z.any().optional().describe('Cursor for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.queryEvents({
      service: ctx.input.service,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      limit: ctx.input.limit,
      searchAfter: ctx.input.searchAfter,
      q: ctx.input.searchQuery
    });

    let events = result.events.map(e => ({
      eventId: e.id,
      timestamp: e.timestamp,
      eventType: e.event_type,
      service: e.service,
      initiatedById: e.initiated_by?.id,
      initiatedByType: e.initiated_by?.type,
      initiatedByEmail: e.initiated_by?.email,
      resourceId: e.resource?.id,
      resourceType: e.resource?.type,
      organization: e.organization,
      rawEvent: e
    }));

    return {
      output: {
        events,
        searchAfter: result.searchAfter
      },
      message: `Retrieved **${events.length}** events from Directory Insights.${result.searchAfter ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
