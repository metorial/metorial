import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.number().describe('Unique event identifier'),
  title: z.string().describe('Event title'),
  description: z.string().optional().describe('Event description'),
  currency: z.string().optional().describe('Currency code'),
  startDate: z.string().optional().describe('Event start date'),
  endDate: z.string().optional().describe('Event end date'),
  startTime: z.string().optional().describe('Event start time'),
  endTime: z.string().optional().describe('Event end time'),
  dateId: z.number().optional().describe('Event date ID'),
  timeZone: z.string().optional().describe('Event timezone'),
  ticketsSold: z.number().optional().describe('Number of tickets sold'),
  ticketsTotal: z.number().optional().describe('Total number of tickets'),
  status: z
    .string()
    .optional()
    .describe('Event status: Live, Draft, Unpublished, or Completed'),
  showRemaining: z
    .boolean()
    .optional()
    .describe('Whether remaining ticket count is displayed'),
  twitterHashtag: z.string().optional().describe('Twitter hashtag for the event'),
  utcOffset: z.string().optional().describe('UTC offset'),
  inviteCode: z.string().optional().describe('Invite code'),
  url: z.string().optional().describe('Event URL'),
  logoUrl: z.string().optional().describe('Event logo URL'),
  bgImageUrl: z.string().optional().describe('Event background image URL'),
  venue: z.string().optional().describe('Event venue'),
  categories: z.string().optional().describe('Comma-separated event categories'),
  language: z.string().optional().describe('Event language')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve a list of events from your Eventzilla account. Filter by status (live, draft, unpublished, completed) or category. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['live', 'draft', 'unpublished', 'completed'])
        .optional()
        .describe('Filter events by status'),
      category: z
        .string()
        .optional()
        .describe('Filter events by category (e.g., Music, Business)'),
      offset: z.number().optional().describe('Number of records to skip (default: 0)'),
      limit: z.number().optional().describe('Number of records per page (default: 20)')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events'),
      pagination: z
        .object({
          offset: z.number().describe('Current offset'),
          limit: z.number().describe('Current limit'),
          total: z.number().describe('Total number of events')
        })
        .optional()
        .describe('Pagination details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listEvents({
      status: ctx.input.status,
      category: ctx.input.category,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let rawEvents = Array.isArray(data?.events)
      ? data.events
      : Array.isArray(data)
        ? data
        : [];
    let rawPagination = data?.pagination?.[0] ?? data?.pagination;

    let events = rawEvents.map((e: any) => ({
      eventId: e.id,
      title: e.title,
      description: e.description,
      currency: e.currency,
      startDate: e.start_date,
      endDate: e.end_date,
      startTime: e.start_time,
      endTime: e.end_time,
      dateId: e.dateid,
      timeZone: e.time_zone,
      ticketsSold: e.tickets_sold,
      ticketsTotal: e.tickets_total,
      status: e.status,
      showRemaining: e.show_remaining,
      twitterHashtag: e.twitter_hashtag,
      utcOffset: e.utc_offset,
      inviteCode: e.invite_code,
      url: e.url,
      logoUrl: e.logo_url,
      bgImageUrl: e.bgimage_url,
      venue: e.venue,
      categories: e.categories,
      language: e.language
    }));

    let pagination = rawPagination
      ? {
          offset: rawPagination.offset,
          limit: rawPagination.limit,
          total: rawPagination.total
        }
      : undefined;

    return {
      output: { events, pagination },
      message: `Found **${events.length}** event(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}${ctx.input.category ? ` in category "${ctx.input.category}"` : ''}.`
    };
  })
  .build();
