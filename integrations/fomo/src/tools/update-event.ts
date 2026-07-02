import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update an existing Fomo event's fields. Only the fields you provide will be changed; all other fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Unique ID of the event to update.'),
      eventTypeId: z.string().optional().describe('New template ID.'),
      eventTypeTag: z.string().optional().describe('New template tag.'),
      externalId: z.string().optional().describe('New external identifier.'),
      firstName: z.string().optional().describe('New first name.'),
      emailAddress: z.string().optional().describe('New email address.'),
      ipAddress: z.string().optional().describe('New IP address.'),
      city: z.string().optional().describe('New city.'),
      province: z.string().optional().describe('New province.'),
      country: z.string().optional().describe('New country (ISO-2 code preferred).'),
      title: z.string().optional().describe('New event title.'),
      url: z.string().optional().describe('New redirect URL.'),
      imageUrl: z.string().optional().describe('New image URL.'),
      customEventFieldsAttributes: z
        .array(
          z.object({
            key: z.string().describe('Custom field key.'),
            value: z.string().describe('Custom field value.')
          })
        )
        .optional()
        .describe('New custom event fields.'),
      createdAt: z
        .string()
        .optional()
        .describe('New creation time in UTC format: "2018-01-01 23:00:00Z".')
    })
  )
  .output(
    z.object({
      eventId: z.number().optional().describe('Unique ID of the updated event.'),
      eventTypeId: z.string().optional().describe('Template ID.'),
      externalId: z.string().optional().describe('External identifier.'),
      firstName: z.string().optional().describe('First name.'),
      city: z.string().optional().describe('City.'),
      country: z.string().optional().describe('Country.'),
      title: z.string().optional().describe('Event title.'),
      url: z.string().optional().describe('Redirect URL.'),
      imageUrl: z.string().optional().describe('Image URL.'),
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

    let { eventId, ...updateFields } = ctx.input;
    let event = await client.updateEvent(eventId, updateFields);

    return {
      output: {
        eventId: event.eventId,
        eventTypeId: event.eventTypeId,
        externalId: event.externalId,
        firstName: event.firstName,
        city: event.city,
        country: event.country,
        title: event.title,
        url: event.url,
        imageUrl: event.imageUrl,
        message: event.message,
        link: event.link,
        customEventFieldsAttributes: event.customEventFieldsAttributes
      },
      message: `Updated event **#${event.eventId}**${event.title ? ` "${event.title}"` : ''}.`
    };
  })
  .build();
