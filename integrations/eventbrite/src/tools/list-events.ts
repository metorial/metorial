import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getEventName } from '../lib/events';
import { organizationIdSchema } from '../lib/schemas';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events belonging to an organization. Supports filtering by status and time, and pagination. Call get_user with includeOrganizations=true to discover organization IDs; uses the optional configured default when omitted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      nameFilter: z.string().optional().describe('Filter organization events by name.'),
      venueId: z.string().optional().describe('Filter by venue ID from manage_venue.'),
      organizerId: z.string().optional().describe('Filter by organizer ID.'),
      status: z
        .enum(['draft', 'live', 'started', 'ended', 'completed', 'canceled', 'all'])
        .optional()
        .describe('Filter events by status.'),
      timeFilter: z
        .enum(['current_future', 'past'])
        .optional()
        .describe('Filter events by time.'),
      orderBy: z
        .enum(['start_asc', 'start_desc', 'created_asc', 'created_desc'])
        .optional()
        .describe('Order results.'),
      page: z.number().optional().describe('Page number for pagination.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.'),
      pageSize: z.number().optional().describe('Number of results per page.')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string(),
            name: z.string(),
            status: z.string().optional(),
            startUtc: z.string().optional(),
            endUtc: z.string().optional(),
            url: z.string().optional(),
            capacity: z.number().optional(),
            onlineEvent: z.boolean().optional()
          })
        )
        .describe('List of events.'),
      hasMore: z.boolean().describe('Whether there are more pages of results.'),
      continuation: z.string().optional().describe('Token to retrieve the next page.'),
      pageCount: z.number().optional().describe('Total number of pages.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw createApiServiceError(
        'Organization ID is required. Call get_user with includeOrganizations=true to discover IDs, then provide organizationId.'
      );
    }

    validateIntegerFields(ctx.input, ['page', 'pageSize'], 1);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listOrganizationEvents(orgId, {
      status: ctx.input.status,
      name_filter: ctx.input.nameFilter,
      venue_filter: ctx.input.venueId,
      organizer_filter: ctx.input.organizerId,
      order_by: ctx.input.orderBy,
      time_filter: ctx.input.timeFilter,
      continuation: ctx.input.continuation,
      page: ctx.input.page,
      page_size: ctx.input.pageSize
    });

    let events = (result.events || []).map((event: any) => ({
      eventId: event.id,
      name: getEventName(event.name),
      status: event.status ?? undefined,
      startUtc: event.start?.utc ?? undefined,
      endUtc: event.end?.utc ?? undefined,
      url: event.url ?? undefined,
      capacity: event.capacity ?? undefined,
      onlineEvent: event.online_event ?? undefined
    }));

    return {
      output: {
        events,
        hasMore: result.pagination?.has_more_items || false,
        continuation: result.pagination?.continuation ?? undefined,
        pageCount: result.pagination?.page_count ?? undefined
      },
      message: `Found **${events.length}** events (page ${result.pagination?.page_number || 1} of ${result.pagination?.page_count || 1}).`
    };
  })
  .build();
