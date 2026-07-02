import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calendlyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Scheduled Events',
  key: 'list_scheduled_events',
  description: `List scheduled events (meetings) for a user or organization. Filter by status, date range, or invitee email. Results are paginated.
Use **userUri** or **organizationUri** (at least one required) to scope the results. The authenticated user's URI and organization URI are available from the auth context.`,
  instructions: [
    'At least one of userUri or organizationUri must be provided.',
    'Date range filters use ISO 8601 format (e.g., "2025-01-01T00:00:00Z").',
    'Sort by "start_time:asc" or "start_time:desc".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userUri: z
        .string()
        .optional()
        .describe(
          'Calendly user URI to list events for (e.g., https://api.calendly.com/users/XXXX)'
        ),
      organizationUri: z
        .string()
        .optional()
        .describe('Organization URI to list events across all members'),
      status: z.enum(['active', 'canceled']).optional().describe('Filter by event status'),
      minStartTime: z
        .string()
        .optional()
        .describe('Only events starting at or after this time (ISO 8601)'),
      maxStartTime: z
        .string()
        .optional()
        .describe('Only events starting before this time (ISO 8601)'),
      inviteeEmail: z.string().optional().describe('Filter events by invitee email address'),
      sort: z
        .string()
        .optional()
        .describe('Sort order, e.g. "start_time:asc" or "start_time:desc"'),
      count: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventUri: z.string().describe('Unique URI of the scheduled event'),
          name: z.string().describe('Event name'),
          status: z.string().describe('Event status (active or canceled)'),
          startTime: z.string().describe('Event start time (ISO 8601)'),
          endTime: z.string().describe('Event end time (ISO 8601)'),
          eventType: z.string().describe('URI of the associated event type'),
          location: z.any().optional().describe('Meeting location details'),
          inviteesCounter: z
            .object({
              total: z.number(),
              active: z.number(),
              limit: z.number()
            })
            .describe('Invitee counts'),
          eventMemberships: z
            .array(
              z.object({
                user: z.string(),
                userEmail: z.string(),
                userName: z.string()
              })
            )
            .describe('Event hosts/members'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.userUri && !ctx.input.organizationUri) {
      throw calendlyServiceError('Provide either userUri or organizationUri to list events.');
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.listScheduledEvents({
      userUri: ctx.input.userUri,
      organizationUri: ctx.input.organizationUri,
      status: ctx.input.status,
      minStartTime: ctx.input.minStartTime,
      maxStartTime: ctx.input.maxStartTime,
      inviteeEmail: ctx.input.inviteeEmail,
      sort: ctx.input.sort,
      count: ctx.input.count,
      pageToken: ctx.input.pageToken
    });

    let events = result.collection.map(e => ({
      eventUri: e.uri,
      name: e.name,
      status: e.status,
      startTime: e.startTime,
      endTime: e.endTime,
      eventType: e.eventType,
      location: e.location,
      inviteesCounter: e.inviteesCounter,
      eventMemberships: e.eventMemberships,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    }));

    return {
      output: {
        events,
        nextPageToken: result.pagination.nextPageToken
      },
      message: `Found **${events.length}** scheduled events.${result.pagination.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
