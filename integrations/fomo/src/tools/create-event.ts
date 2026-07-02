import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new Fomo notification event. Events represent customer activity (purchases, signups, reviews, etc.) that appear as social proof notifications on your website. Each event must reference a template via **eventTypeId** or **eventTypeTag**.`,
  instructions: [
    'You must specify either eventTypeId (numeric template ID) or eventTypeTag (string tag) to associate the event with a notification template.',
    'Use 2-digit ISO country codes when possible; Fomo auto-converts them to full names.',
    'The emailAddress is used to fetch Gravatar images and is never shown publicly.',
    'The ipAddress is used for geolocation to populate city/province/country if not provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventTypeId: z
        .string()
        .optional()
        .describe('Numeric ID of the notification template to use.'),
      eventTypeTag: z
        .string()
        .optional()
        .describe(
          'String tag of the notification template. Useful for multi-environment setups.'
        ),
      externalId: z.string().optional().describe('External identifier for deduplication.'),
      firstName: z
        .string()
        .optional()
        .describe('First name of the person associated with the event.'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address, used to fetch Gravatar avatars.'),
      ipAddress: z.string().optional().describe('IP address, used for geolocation.'),
      city: z.string().optional().describe('City where the event occurred.'),
      province: z.string().optional().describe('State or province where the event occurred.'),
      country: z.string().optional().describe('Country (ISO-2 code preferred).'),
      title: z.string().optional().describe('Event title or product name.'),
      url: z
        .string()
        .optional()
        .describe('URL to redirect visitors when they click the notification.'),
      imageUrl: z
        .string()
        .optional()
        .describe(
          'Image URL to display in the notification (square, max 125x125px recommended).'
        ),
      customEventFieldsAttributes: z
        .array(
          z.object({
            key: z.string().describe('Custom field key.'),
            value: z.string().describe('Custom field value.')
          })
        )
        .optional()
        .describe('Custom event field key-value pairs for template variables.'),
      createdAt: z
        .string()
        .optional()
        .describe('Custom creation time in UTC format: "2018-01-01 23:00:00Z".')
    })
  )
  .output(
    z.object({
      eventId: z.number().optional().describe('Unique ID of the created event.'),
      eventTypeId: z.string().optional().describe('Template ID used by the event.'),
      externalId: z.string().optional().describe('External identifier.'),
      firstName: z.string().optional().describe('First name.'),
      emailAddress: z.string().optional().describe('Email address.'),
      city: z.string().optional().describe('City.'),
      country: z.string().optional().describe('Country.'),
      title: z.string().optional().describe('Event title.'),
      url: z.string().optional().describe('Redirect URL.'),
      imageUrl: z.string().optional().describe('Image URL.'),
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
    let event = await client.createEvent(ctx.input);

    return {
      output: {
        eventId: event.eventId,
        eventTypeId: event.eventTypeId,
        externalId: event.externalId,
        firstName: event.firstName,
        emailAddress: event.emailAddress,
        city: event.city,
        country: event.country,
        title: event.title,
        url: event.url,
        imageUrl: event.imageUrl,
        message: event.message,
        link: event.link,
        customEventFieldsAttributes: event.customEventFieldsAttributes
      },
      message: `Created event **#${event.eventId}**${event.title ? ` "${event.title}"` : ''}${event.message ? ` — "${event.message}"` : ''}.`
    };
  })
  .build();
