import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkinAttendeeTool = SlateTool.create(spec, {
  name: 'Check In Attendee',
  key: 'checkin_attendee',
  description: `Check in or revert check-in for an attendee using their unique barcode. Set **checkin** to \`true\` to check in, or \`false\` to revert a previous check-in.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      barcode: z.string().describe('The unique barcode of the attendee'),
      checkin: z.boolean().describe('true to check in, false to revert check-in')
    })
  )
  .output(
    z.object({
      firstName: z.string().optional().describe('Attendee first name'),
      lastName: z.string().optional().describe('Attendee last name'),
      eventTitle: z.string().optional().describe('Event title'),
      orderRef: z.string().optional().describe('Order reference number'),
      email: z.string().optional().describe('Attendee email'),
      status: z.string().optional().describe('Check-in status result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.checkinAttendee(ctx.input.barcode, ctx.input.checkin);

    let output = {
      firstName: data.first_name,
      lastName: data.last_name,
      eventTitle: data.eventtitle,
      orderRef: data.orderef,
      email: data.email,
      status: data.status
    };

    let action = ctx.input.checkin ? 'checked in' : 'check-in reverted for';

    return {
      output,
      message: `Successfully ${action} **${output.firstName} ${output.lastName}** for event "${output.eventTitle}".`
    };
  })
  .build();
