import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve a single Fomo event by its ID. Returns the full event including the rendered notification message and all associated fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Unique ID of the event to retrieve.')
    })
  )
  .output(
    z.object({
      eventId: z.number().optional().describe('Unique ID of the event.'),
      applicationId: z.number().optional().describe('Application ID.'),
      eventTypeId: z.string().optional().describe('Template ID.'),
      externalId: z.string().optional().describe('External identifier.'),
      firstName: z.string().optional().describe('First name.'),
      emailAddress: z.string().optional().describe('Email address.'),
      ipAddress: z.string().optional().describe('IP address.'),
      city: z.string().optional().describe('City.'),
      province: z.string().optional().describe('Province.'),
      country: z.string().optional().describe('Country.'),
      title: z.string().optional().describe('Event title.'),
      url: z.string().optional().describe('Redirect URL.'),
      imageUrl: z.string().optional().describe('Image URL.'),
      createdAtToSecondsFromEpoch: z
        .number()
        .optional()
        .describe('Creation timestamp (seconds since epoch).'),
      message: z.string().optional().describe('Rendered notification message.'),
      link: z.string().optional().describe('Full notification link with UTM parameters.'),
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
    let event = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: event.eventId,
        applicationId: event.applicationId,
        eventTypeId: event.eventTypeId,
        externalId: event.externalId,
        firstName: event.firstName,
        emailAddress: event.emailAddress,
        ipAddress: event.ipAddress,
        city: event.city,
        province: event.province,
        country: event.country,
        title: event.title,
        url: event.url,
        imageUrl: event.imageUrl,
        createdAtToSecondsFromEpoch: event.createdAtToSecondsFromEpoch,
        message: event.message,
        link: event.link,
        customEventFieldsAttributes: event.customEventFieldsAttributes
      },
      message: `Retrieved event **#${event.eventId}**${event.title ? ` "${event.title}"` : ''}${event.message ? ` — "${event.message}"` : ''}.`
    };
  })
  .build();
