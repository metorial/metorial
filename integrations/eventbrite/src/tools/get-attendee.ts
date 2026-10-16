import { SlateTool } from 'slates';
import { z } from 'zod';
import { attendeeSchema, mapAttendee } from '../lib/attendees';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAttendee = SlateTool.create(spec, {
  name: 'Get Attendee',
  key: 'get_attendee',
  description:
    'Retrieve one attendee by event and attendee ID, including ticket, order, profile, and check-in details. Call list_attendees to discover attendee IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID.'),
      attendeeId: z.string().describe('Attendee ID from list_attendees.')
    })
  )
  .output(attendeeSchema)
  .handleInvocation(async ctx => {
    let attendee = await new Client({ token: ctx.auth.token }).getAttendee(
      ctx.input.eventId,
      ctx.input.attendeeId
    );
    return {
      output: mapAttendee(attendee),
      message: `Retrieved attendee \`${attendee.id}\`.`
    };
  })
  .build();
