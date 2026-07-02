import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listEventTypes = SlateTool.create(spec, {
  name: 'List Event Types',
  key: 'list_event_types',
  description: `List event types (bookable services) for a site. Event types define the services available for scheduling, including duration, pricing, and attendance details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list event types for'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'position'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      eventTypes: z.array(
        z.object({
          eventTypeId: z.string(),
          name: z.string(),
          slug: z.string(),
          description: z.string().nullable(),
          length: z.number().describe('Duration in minutes'),
          priceInCents: z.number(),
          currency: z.string(),
          attendanceType: z.string(),
          maxAttendees: z.number().nullable(),
          requiresConfirmation: z.boolean(),
          hidden: z.boolean(),
          color: z.string().nullable(),
          siteId: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listEventTypes({
      siteId: ctx.input.siteId,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let eventTypes = result.items.map(et => ({
      eventTypeId: et.id,
      name: et.name,
      slug: et.slug,
      description: et.description,
      length: et.length,
      priceInCents: et.priceInCents,
      currency: et.currency,
      attendanceType: et.attendanceType,
      maxAttendees: et.maxAttendees,
      requiresConfirmation: et.requiresConfirmation,
      hidden: et.hidden,
      color: et.color,
      siteId: et.siteId,
      createdAt: et.createdAt,
      updatedAt: et.updatedAt
    }));

    return {
      output: {
        eventTypes,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** event type(s). Returned ${eventTypes.length} on this page.`
    };
  })
  .build();
