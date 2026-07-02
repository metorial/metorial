import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchEvent = SlateTool.create(spec, {
  name: 'Search Event',
  key: 'search_event',
  description: `Search for a Fomo event by **email address** or **external ID**. Returns the most recently created event matching the query. Useful for looking up events before updating or deleting them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      field: z.enum(['email_address', 'external_id']).describe('Field to search by.'),
      query: z
        .string()
        .describe(
          'Value to match (e.g., "john@gmail.com" for email_address, or "order-123" for external_id).'
        )
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a matching event was found.'),
      eventId: z.number().optional().describe('Unique ID of the found event.'),
      applicationId: z.number().optional().describe('Application ID.'),
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let event = await client.searchEvent(ctx.input.field, ctx.input.query);

    if (!event) {
      return {
        output: { found: false },
        message: `No event found matching ${ctx.input.field} = "${ctx.input.query}".`
      };
    }

    return {
      output: {
        found: true,
        eventId: event.eventId,
        applicationId: event.applicationId,
        eventTypeId: event.eventTypeId,
        externalId: event.externalId,
        firstName: event.firstName,
        emailAddress: event.emailAddress,
        city: event.city,
        country: event.country,
        title: event.title,
        url: event.url,
        imageUrl: event.imageUrl,
        createdAtToSecondsFromEpoch: event.createdAtToSecondsFromEpoch,
        message: event.message,
        link: event.link,
        customEventFieldsAttributes: event.customEventFieldsAttributes
      },
      message: `Found event **#${event.eventId}**${event.title ? ` "${event.title}"` : ''} matching ${ctx.input.field} = "${ctx.input.query}".`
    };
  })
  .build();
