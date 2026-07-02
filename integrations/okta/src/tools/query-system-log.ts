import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let logEventSchema = z.object({
  eventId: z.string().describe('Unique event UUID'),
  published: z.string().describe('ISO 8601 timestamp when the event was published'),
  eventType: z.string().describe('Okta event type identifier, e.g. user.session.start'),
  severity: z.string().describe('Event severity (DEBUG, INFO, WARN, ERROR)'),
  displayMessage: z.string().describe('Human-readable event description'),
  actorId: z.string().describe('ID of the actor who triggered the event'),
  actorType: z.string().describe('Type of actor (User, SystemPrincipal, etc.)'),
  actorDisplayName: z.string().optional(),
  actorAlternateId: z
    .string()
    .optional()
    .describe('Actor alternate ID (typically email or login)'),
  outcomeResult: z.string().describe('Outcome (SUCCESS, FAILURE, SKIPPED, UNKNOWN)'),
  outcomeReason: z.string().optional(),
  targets: z
    .array(
      z.object({
        targetId: z.string(),
        targetType: z.string(),
        displayName: z.string().optional(),
        alternateId: z.string().optional()
      })
    )
    .optional()
    .describe('Resources affected by the event'),
  clientIpAddress: z.string().optional(),
  clientDevice: z.string().optional(),
  clientCity: z.string().optional(),
  clientCountry: z.string().optional()
});

export let querySystemLogTool = SlateTool.create(spec, {
  name: 'Query System Log',
  key: 'query_system_log',
  description: `Query the Okta System Log for audit events. Supports filtering by time range, event type, keyword search, and Okta filter expressions. Useful for auditing, security monitoring, and troubleshooting.`,
  instructions: [
    'Filter examples: `eventType eq "user.session.start"`, `actor.id eq "00u1234"`, `outcome.result eq "FAILURE"`.',
    'Use "since" and "until" with ISO 8601 timestamps for time-bounded queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      since: z
        .string()
        .optional()
        .describe('Start date/time in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)'),
      until: z.string().optional().describe('End date/time in ISO 8601 format'),
      filter: z.string().optional().describe('Okta SCIM filter expression'),
      query: z.string().optional().describe('Keyword search across event fields'),
      sortOrder: z
        .enum(['ASCENDING', 'DESCENDING'])
        .optional()
        .describe('Sort order by published timestamp (default ASCENDING)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum events to return (default 100, max 1000)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      events: z.array(logEventSchema),
      nextCursor: z.string().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let result = await client.getSystemLogs({
      since: ctx.input.since,
      until: ctx.input.until,
      filter: ctx.input.filter,
      query: ctx.input.query,
      sortOrder: ctx.input.sortOrder,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let events = result.items.map(e => ({
      eventId: e.uuid,
      published: e.published,
      eventType: e.eventType,
      severity: e.severity,
      displayMessage: e.displayMessage,
      actorId: e.actor.id,
      actorType: e.actor.type,
      actorDisplayName: e.actor.displayName,
      actorAlternateId: e.actor.alternateId,
      outcomeResult: e.outcome.result,
      outcomeReason: e.outcome.reason,
      targets: e.target?.map(t => ({
        targetId: t.id,
        targetType: t.type,
        displayName: t.displayName,
        alternateId: t.alternateId
      })),
      clientIpAddress: e.client?.ipAddress,
      clientDevice: e.client?.device,
      clientCity: e.client?.geographicalContext?.city,
      clientCountry: e.client?.geographicalContext?.country
    }));

    let nextCursor: string | undefined;
    if (result.nextUrl) {
      let url = new URL(result.nextUrl);
      nextCursor = url.searchParams.get('after') || undefined;
    }

    return {
      output: {
        events,
        nextCursor,
        hasMore: !!result.nextUrl
      },
      message: `Retrieved **${events.length}** log event(s)${result.nextUrl ? ' (more available)' : ''}.`
    };
  })
  .build();
