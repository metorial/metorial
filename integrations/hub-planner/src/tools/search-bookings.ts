import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchBookings = SlateTool.create(spec, {
  name: 'Search Bookings',
  key: 'search_bookings',
  description: `Search and filter bookings using advanced query operators. Filter by resource, project, date ranges, and more. Use page and limit to retrieve additional results; the API returns 20 bookings by default.
Use operators like **$in**, **$nin**, **$lt**, **$lte**, **$gte**, **$gt** for flexible querying.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().min(0).optional().describe('Page number (0-based)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page, up to 1000'),
      resources: z
        .any()
        .optional()
        .describe('Filter by resource IDs (e.g. { "$in": ["resourceId1"] })'),
      project: z.any().optional().describe('Filter by project ID'),
      start: z
        .any()
        .optional()
        .describe('Filter by start date (e.g. { "$gte": "2024-01-01" })'),
      end: z.any().optional().describe('Filter by end date (e.g. { "$lte": "2024-12-31" })'),
      updatedDate: z.any().optional().describe('Filter by updated date'),
      metadata: z.any().optional().describe('Filter by metadata'),
      deleted: z.boolean().optional().describe('Include deleted bookings')
    })
  )
  .output(
    z.object({
      bookings: z
        .array(
          z.object({
            bookingId: z.string().describe('Booking ID'),
            resourceId: z.string().optional().describe('Resource ID'),
            projectId: z.string().optional().describe('Project ID'),
            start: z.string().optional().describe('Start date'),
            end: z.string().optional().describe('End date'),
            title: z.string().optional().describe('Booking title'),
            state: z.string().optional().describe('State type'),
            stateValue: z.number().optional().describe('State value'),
            type: z.string().optional().describe('Booking type'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching bookings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filters: Record<string, any> = {};

    if (ctx.input.resources !== undefined) filters.resources = ctx.input.resources;
    if (ctx.input.project !== undefined) filters.project = ctx.input.project;
    if (ctx.input.start !== undefined) filters.start = ctx.input.start;
    if (ctx.input.end !== undefined) filters.end = ctx.input.end;
    if (ctx.input.updatedDate !== undefined) filters.updatedDate = ctx.input.updatedDate;
    if (ctx.input.metadata !== undefined) filters.metadata = ctx.input.metadata;
    if (ctx.input.deleted !== undefined) filters.deleted = ctx.input.deleted;

    let bookings = await client.searchBookings(filters, ctx.input.page, ctx.input.limit);
    return {
      output: {
        bookings: bookings.map((b: any) => ({
          bookingId: b._id,
          resourceId: b.resource ?? undefined,
          projectId: b.project ?? undefined,
          start: b.start ?? undefined,
          end: b.end ?? undefined,
          title: b.title ?? undefined,
          state: b.state ?? undefined,
          stateValue: b.stateValue ?? undefined,
          type: b.type ?? undefined,
          createdDate: b.createdDate ?? undefined,
          updatedDate: b.updatedDate ?? undefined
        }))
      },
      message: `Found **${bookings.length}** bookings matching the search criteria.`
    };
  })
  .build();
