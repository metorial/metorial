import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List all Fomo events with pagination support. Returns events along with pagination metadata (current page, total pages, total count).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Number of events per page (default: 30).'),
      page: z.number().optional().describe('Page number to retrieve (default: 1).')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.number().optional().describe('Unique ID of the event.'),
            eventTypeId: z.string().optional().describe('Template ID.'),
            externalId: z.string().optional().describe('External identifier.'),
            firstName: z.string().optional().describe('First name.'),
            emailAddress: z.string().optional().describe('Email address.'),
            city: z.string().optional().describe('City.'),
            country: z.string().optional().describe('Country.'),
            title: z.string().optional().describe('Event title.'),
            url: z.string().optional().describe('Redirect URL.'),
            imageUrl: z.string().optional().describe('Image URL.'),
            createdAtToSecondsFromEpoch: z.number().optional().describe('Creation timestamp.'),
            message: z.string().optional().describe('Rendered notification message.'),
            link: z.string().optional().describe('Full notification link.'),
            customEventFieldsAttributes: z
              .array(
                z.object({
                  key: z.string(),
                  value: z.string()
                })
              )
              .optional()
              .describe('Custom event fields.')
          })
        )
        .describe('List of events.'),
      page: z.number().optional().describe('Current page number.'),
      totalPages: z.number().optional().describe('Total number of pages.'),
      perPage: z.number().optional().describe('Events per page.'),
      totalCount: z.number().optional().describe('Total number of events.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEvents({
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let events = result.events.map(e => ({
      eventId: e.eventId,
      eventTypeId: e.eventTypeId,
      externalId: e.externalId,
      firstName: e.firstName,
      emailAddress: e.emailAddress,
      city: e.city,
      country: e.country,
      title: e.title,
      url: e.url,
      imageUrl: e.imageUrl,
      createdAtToSecondsFromEpoch: e.createdAtToSecondsFromEpoch,
      message: e.message,
      link: e.link,
      customEventFieldsAttributes: e.customEventFieldsAttributes
    }));

    return {
      output: {
        events,
        page: result.meta?.page,
        totalPages: result.meta?.totalPages,
        perPage: result.meta?.perPage,
        totalCount: result.meta?.totalCount
      },
      message: `Retrieved **${events.length}** events${result.meta ? ` (page ${result.meta.page} of ${result.meta.totalPages}, ${result.meta.totalCount} total)` : ''}.`
    };
  })
  .build();
