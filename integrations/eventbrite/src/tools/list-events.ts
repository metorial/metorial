import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events belonging to an organization. Supports filtering by status and time, and pagination. Uses the organization ID from config if not explicitly provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'The organization ID. Falls back to the configured organization ID if not provided.'
        ),
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
      pageCount: z.number().optional().describe('Total number of pages.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listOrganizationEvents(orgId, {
      status: ctx.input.status,
      order_by: ctx.input.orderBy,
      time_filter: ctx.input.timeFilter,
      page: ctx.input.page,
      page_size: ctx.input.pageSize
    });

    let events = (result.events || []).map((event: any) => ({
      eventId: event.id,
      name: event.name?.html || event.name?.text || '',
      status: event.status,
      startUtc: event.start?.utc,
      endUtc: event.end?.utc,
      url: event.url,
      capacity: event.capacity,
      onlineEvent: event.online_event
    }));

    return {
      output: {
        events,
        hasMore: result.pagination?.has_more_items || false,
        pageCount: result.pagination?.page_count
      },
      message: `Found **${events.length}** events (page ${result.pagination?.page_number || 1} of ${result.pagination?.page_count || 1}).`
    };
  })
  .build();
