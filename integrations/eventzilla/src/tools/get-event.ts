import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventTool = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve details for a specific event by its ID, including title, dates, venue, ticket counts, status, branding, and categories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The unique event ID')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Unique event identifier'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      descriptionHtml: z.string().optional().describe('Event description in HTML'),
      currency: z.string().optional().describe('Currency code'),
      startDate: z.string().optional().describe('Event start date'),
      endDate: z.string().optional().describe('Event end date'),
      startTime: z.string().optional().describe('Event start time'),
      endTime: z.string().optional().describe('Event end time'),
      dateId: z.number().optional().describe('Event date ID'),
      timeZone: z.string().optional().describe('Event timezone'),
      timezoneCode: z.string().optional().describe('Timezone code'),
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
      twitterHashtag: z.string().optional().describe('Twitter hashtag'),
      utcOffset: z.string().optional().describe('UTC offset'),
      inviteCode: z.string().optional().describe('Invite code'),
      url: z.string().optional().describe('Event URL'),
      logoUrl: z.string().optional().describe('Event logo URL'),
      bgImageUrl: z.string().optional().describe('Event background image URL'),
      venue: z.string().optional().describe('Event venue'),
      categories: z.string().optional().describe('Comma-separated event categories'),
      language: z.string().optional().describe('Event language')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getEvent(ctx.input.eventId);
    let e = Array.isArray(data?.events)
      ? data.events[0]
      : Array.isArray(data)
        ? data[0]
        : data;

    let output = {
      eventId: e.id,
      title: e.title,
      description: e.description,
      descriptionHtml: e.description_html,
      currency: e.currency,
      startDate: e.start_date,
      endDate: e.end_date,
      startTime: e.start_time,
      endTime: e.end_time,
      dateId: e.dateid,
      timeZone: e.time_zone,
      timezoneCode: e.timezone_code,
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
    };

    return {
      output,
      message: `Retrieved event **${output.title}** (status: ${output.status}).`
    };
  })
  .build();
