import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Creates a new event in your Heartbeat community. Events can have a location (Zoom requires an integrated Zoom account, Heartbeat creates a custom voice channel). You can invite attendees by email — existing users are invited directly, others receive an email invite.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the event'),
      description: z.string().optional().describe('Description of the event'),
      startDate: z.string().describe('Start date and time in ISO 8601 format'),
      endDate: z.string().optional().describe('End date and time in ISO 8601 format'),
      location: z
        .string()
        .optional()
        .describe('Event location — e.g. "zoom", "heartbeat", or a custom URL/address'),
      emails: z
        .array(z.string())
        .optional()
        .describe('List of email addresses to invite as attendees')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      name: z.string().describe('Name of the created event'),
      startDate: z.string().describe('Start date of the event'),
      createdAt: z.string().describe('Timestamp when the event was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let event = await client.createEvent({
      name: ctx.input.name,
      description: ctx.input.description,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      location: ctx.input.location,
      emails: ctx.input.emails
    });

    return {
      output: {
        eventId: event.id,
        name: event.name,
        startDate: event.startDate,
        createdAt: event.createdAt
      },
      message: `Created event **${event.name}** starting at ${event.startDate}.${ctx.input.emails?.length ? ` Invited ${ctx.input.emails.length} attendee(s).` : ''}`
    };
  })
  .build();
